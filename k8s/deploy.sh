#!/bin/bash

# Network Visualizer Kubernetes Deployment Script
# Usage: ./deploy.sh [environment]
# Example: ./deploy.sh production

set -e

ENVIRONMENT=${1:-development}
NAMESPACE="network-visualizer"

echo "=========================================="
echo "Network Visualizer Deployment Script"
echo "Environment: $ENVIRONMENT"
echo "Namespace: $NAMESPACE"
echo "=========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl not found. Please install kubectl first."
    exit 1
fi

# Check if we can connect to the cluster
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

print_info "Connected to cluster: $(kubectl config current-context)"

# Create namespace
print_info "Creating namespace: $NAMESPACE"
kubectl apply -f namespace.yaml

# Create secrets
if kubectl get secret network-visualizer-secrets -n $NAMESPACE &> /dev/null; then
    print_warn "Secret 'network-visualizer-secrets' already exists. Skipping..."
else
    print_info "Creating secrets..."
    echo ""
    echo "Please enter your Elasticsearch configuration:"
    read -p "Elasticsearch Node (e.g., https://elasticsearch:9200): " ES_NODE
    read -p "Elasticsearch Username: " ES_USERNAME
    read -sp "Elasticsearch Password: " ES_PASSWORD
    echo ""

    kubectl create secret generic network-visualizer-secrets \
        --from-literal=ES_NODE="$ES_NODE" \
        --from-literal=ES_USERNAME="$ES_USERNAME" \
        --from-literal=ES_PASSWORD="$ES_PASSWORD" \
        -n $NAMESPACE

    print_info "Secret created successfully"
fi

# Create ConfigMap
print_info "Creating ConfigMap..."
kubectl apply -f configmap.yaml

# Create PersistentVolumeClaim
print_info "Creating PersistentVolumeClaim..."
kubectl apply -f persistent-volume.yaml

# Wait for PVC to be bound
print_info "Waiting for PVC to be bound..."
kubectl wait --for=condition=Bound pvc/backend-data-pvc -n $NAMESPACE --timeout=60s || {
    print_warn "PVC is not bound yet. It may take some time depending on your storage provisioner."
}

# Deploy backend
print_info "Deploying backend..."
kubectl apply -f backend-deployment.yaml

# Wait for backend to be ready
print_info "Waiting for backend to be ready..."
kubectl rollout status deployment/backend -n $NAMESPACE --timeout=5m

# Check backend health
print_info "Checking backend health..."
BACKEND_POD=$(kubectl get pod -n $NAMESPACE -l component=backend -o jsonpath='{.items[0].metadata.name}')
kubectl wait --for=condition=Ready pod/$BACKEND_POD -n $NAMESPACE --timeout=2m

# Deploy frontend
print_info "Deploying frontend..."
kubectl apply -f frontend-deployment.yaml

# Wait for frontend to be ready
print_info "Waiting for frontend to be ready..."
kubectl rollout status deployment/frontend -n $NAMESPACE --timeout=5m

# Deploy ingress
print_info "Deploying ingress..."
read -p "Enter your domain name (e.g., network-visualizer.example.com): " DOMAIN

# Update ingress with domain
sed -i.bak "s/network-visualizer.example.com/$DOMAIN/g" ingress.yaml
kubectl apply -f ingress.yaml
mv ingress.yaml.bak ingress.yaml

# Optional: Deploy HPA
read -p "Deploy Horizontal Pod Autoscaler? (y/n): " DEPLOY_HPA
if [ "$DEPLOY_HPA" = "y" ]; then
    print_info "Deploying HPA..."
    kubectl apply -f hpa.yaml
fi

echo ""
print_info "=========================================="
print_info "Deployment completed successfully!"
print_info "=========================================="
echo ""

# Print deployment info
print_info "Deployment Information:"
echo "  Namespace: $NAMESPACE"
echo "  Domain: $DOMAIN"
echo ""

print_info "Pod Status:"
kubectl get pods -n $NAMESPACE

echo ""
print_info "Service Status:"
kubectl get svc -n $NAMESPACE

echo ""
print_info "Ingress Status:"
kubectl get ingress -n $NAMESPACE

echo ""
print_info "To view logs:"
echo "  Backend:  kubectl logs -n $NAMESPACE -l component=backend -f"
echo "  Frontend: kubectl logs -n $NAMESPACE -l component=frontend -f"

echo ""
print_info "To access the application:"
echo "  URL: http://$DOMAIN (or https://$DOMAIN if TLS is configured)"
echo "  Note: Make sure your DNS points to the ingress controller's external IP"

echo ""
INGRESS_IP=$(kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')
if [ -n "$INGRESS_IP" ]; then
    print_info "Ingress IP: $INGRESS_IP"
    print_info "Add this to your DNS or /etc/hosts:"
    echo "  $INGRESS_IP $DOMAIN"
else
    print_warn "Ingress IP not available yet. Check with: kubectl get ingress -n $NAMESPACE"
fi

echo ""
print_info "To check application health:"
echo "  kubectl get pods -n $NAMESPACE"
echo "  kubectl describe deployment backend -n $NAMESPACE"
echo "  kubectl describe deployment frontend -n $NAMESPACE"

echo ""
print_info "=========================================="
