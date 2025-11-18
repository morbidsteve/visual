# Kubernetes Deployment Guide

This guide covers deploying the Network Visualizer to a Kubernetes cluster.

## Prerequisites

- Kubernetes cluster (1.20+)
- `kubectl` configured to access your cluster
- Docker registry (Docker Hub, GCR, ECR, or private registry)
- Elasticsearch cluster accessible from Kubernetes
- Ingress controller (nginx, traefik, etc.)
- (Optional) cert-manager for TLS certificates

## Deployment Steps

### 1. Build and Push Docker Images

```bash
# Build backend image
cd backend
docker build -t <your-registry>/network-visualizer-backend:latest .
docker push <your-registry>/network-visualizer-backend:latest

# Build frontend image
cd ../frontend
docker build -t <your-registry>/network-visualizer-frontend:latest .
docker push <your-registry>/network-visualizer-frontend:latest
```

### 2. Update Image References

Edit the deployment files to reference your registry:

**k8s/backend-deployment.yaml:**
```yaml
spec:
  template:
    spec:
      containers:
      - name: backend
        image: <your-registry>/network-visualizer-backend:latest
```

**k8s/frontend-deployment.yaml:**
```yaml
spec:
  template:
    spec:
      containers:
      - name: frontend
        image: <your-registry>/network-visualizer-frontend:latest
```

### 3. Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### 4. Create Secrets

Create the secrets file with your Elasticsearch credentials:

```bash
kubectl create secret generic network-visualizer-secrets \
  --from-literal=ES_NODE=https://your-elasticsearch:9200 \
  --from-literal=ES_USERNAME=elastic \
  --from-literal=ES_PASSWORD=your-password \
  -n network-visualizer
```

Verify the secret:
```bash
kubectl get secret network-visualizer-secrets -n network-visualizer
```

### 5. Create ConfigMap

```bash
kubectl apply -f k8s/configmap.yaml
```

Optionally, edit the ConfigMap first to adjust settings:
```bash
kubectl edit configmap network-visualizer-config -n network-visualizer
```

### 6. Create Persistent Volume

```bash
kubectl apply -f k8s/persistent-volume.yaml
```

Verify:
```bash
kubectl get pvc -n network-visualizer
```

### 7. Deploy Backend

```bash
kubectl apply -f k8s/backend-deployment.yaml
```

Wait for backend to be ready:
```bash
kubectl rollout status deployment/backend -n network-visualizer
kubectl get pods -n network-visualizer -l component=backend
```

Check backend logs:
```bash
kubectl logs -n network-visualizer -l component=backend --tail=50
```

### 8. Deploy Frontend

```bash
kubectl apply -f k8s/frontend-deployment.yaml
```

Wait for frontend to be ready:
```bash
kubectl rollout status deployment/frontend -n network-visualizer
kubectl get pods -n network-visualizer -l component=frontend
```

### 9. Configure Ingress

Edit `k8s/ingress.yaml` to set your domain:
```yaml
spec:
  rules:
  - host: network-visualizer.yourdomain.com  # Change this
```

Apply the ingress:
```bash
kubectl apply -f k8s/ingress.yaml
```

Verify:
```bash
kubectl get ingress -n network-visualizer
kubectl describe ingress network-visualizer-ingress -n network-visualizer
```

### 10. (Optional) Enable Auto-scaling

```bash
kubectl apply -f k8s/hpa.yaml
```

Verify:
```bash
kubectl get hpa -n network-visualizer
```

## Configuration

### Updating Configuration

To update backend configuration:
```bash
kubectl edit configmap network-visualizer-config -n network-visualizer

# Restart backend pods to pick up changes
kubectl rollout restart deployment/backend -n network-visualizer
```

To update secrets:
```bash
kubectl delete secret network-visualizer-secrets -n network-visualizer

kubectl create secret generic network-visualizer-secrets \
  --from-literal=ES_NODE=https://new-elasticsearch:9200 \
  --from-literal=ES_USERNAME=elastic \
  --from-literal=ES_PASSWORD=new-password \
  -n network-visualizer

# Restart backend pods
kubectl rollout restart deployment/backend -n network-visualizer
```

### Scaling

Manual scaling:
```bash
# Scale backend
kubectl scale deployment backend --replicas=3 -n network-visualizer

# Scale frontend
kubectl scale deployment frontend --replicas=3 -n network-visualizer
```

With HPA enabled, scaling happens automatically based on CPU/memory usage.

## TLS/SSL Configuration

### Using cert-manager

1. Install cert-manager:
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

2. Create a ClusterIssuer for Let's Encrypt:
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

3. Update ingress annotations:
```yaml
metadata:
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - network-visualizer.yourdomain.com
    secretName: network-visualizer-tls
```

### Using Manual Certificates

```bash
kubectl create secret tls network-visualizer-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  -n network-visualizer
```

## Monitoring

### Check Pod Status

```bash
kubectl get pods -n network-visualizer
kubectl get pods -n network-visualizer -w  # Watch mode
```

### View Logs

```bash
# Backend logs
kubectl logs -n network-visualizer -l component=backend --tail=100 -f

# Frontend logs
kubectl logs -n network-visualizer -l component=frontend --tail=100 -f

# Specific pod
kubectl logs -n network-visualizer <pod-name> -f
```

### Check Services

```bash
kubectl get svc -n network-visualizer
kubectl describe svc backend -n network-visualizer
kubectl describe svc frontend -n network-visualizer
```

### Check Ingress

```bash
kubectl get ingress -n network-visualizer
kubectl describe ingress network-visualizer-ingress -n network-visualizer
```

### Resource Usage

```bash
kubectl top pods -n network-visualizer
kubectl top nodes
```

## Troubleshooting

### Pods not starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n network-visualizer

# Check pod logs
kubectl logs <pod-name> -n network-visualizer

# Common issues:
# - Image pull errors: Check image name and registry access
# - ConfigMap/Secret errors: Verify they exist
# - Resource limits: Check if node has enough resources
```

### Backend can't connect to Elasticsearch

```bash
# Test connectivity from a pod
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n network-visualizer -- sh
curl -u elastic:password https://your-elasticsearch:9200

# Check DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -n network-visualizer -- nslookup your-elasticsearch

# Check secrets
kubectl get secret network-visualizer-secrets -n network-visualizer -o yaml
```

### Ingress not working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx  # or your ingress namespace

# Check ingress events
kubectl describe ingress network-visualizer-ingress -n network-visualizer

# Test service directly
kubectl port-forward svc/frontend 8080:80 -n network-visualizer
# Access http://localhost:8080
```

### Database persistence issues

```bash
# Check PVC status
kubectl get pvc -n network-visualizer
kubectl describe pvc backend-data-pvc -n network-visualizer

# Check PV
kubectl get pv

# If PVC is pending, check storage class
kubectl get storageclass
```

## Backup and Recovery

### Backup Whitelist Database

```bash
# Get backend pod name
BACKEND_POD=$(kubectl get pod -n network-visualizer -l component=backend -o jsonpath='{.items[0].metadata.name}')

# Copy database from pod
kubectl cp network-visualizer/$BACKEND_POD:/app/data/whitelist.db ./whitelist-backup.db
```

### Restore Whitelist Database

```bash
# Copy database to pod
kubectl cp ./whitelist-backup.db network-visualizer/$BACKEND_POD:/app/data/whitelist.db

# Restart backend
kubectl rollout restart deployment/backend -n network-visualizer
```

## Upgrading

### Rolling Update

```bash
# Update image version in deployment file
# Then apply:
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# Monitor rollout
kubectl rollout status deployment/backend -n network-visualizer
kubectl rollout status deployment/frontend -n network-visualizer
```

### Rollback

```bash
# Rollback backend
kubectl rollout undo deployment/backend -n network-visualizer

# Rollback frontend
kubectl rollout undo deployment/frontend -n network-visualizer

# Rollback to specific revision
kubectl rollout history deployment/backend -n network-visualizer
kubectl rollout undo deployment/backend --to-revision=2 -n network-visualizer
```

## Cleanup

### Remove Application

```bash
kubectl delete -f k8s/
```

### Remove Namespace

```bash
kubectl delete namespace network-visualizer
```

## Production Recommendations

1. **Resource Limits**: Adjust based on your traffic
   - Monitor actual usage and tune requests/limits
   - Consider larger limits for high-traffic environments

2. **Replicas**: Run at least 2 replicas for high availability
   - Enable HPA for automatic scaling
   - Set appropriate min/max replicas

3. **Monitoring**: Set up monitoring and alerting
   - Prometheus + Grafana
   - ELK stack for centralized logging
   - Alert on pod failures, high CPU/memory

4. **Security**:
   - Enable network policies
   - Use RBAC for access control
   - Rotate secrets regularly
   - Enable TLS/SSL
   - Keep images updated

5. **Backup**:
   - Regular backups of whitelist database
   - Backup Kubernetes manifests in version control
   - Document disaster recovery procedures

6. **Performance**:
   - Consider adding Redis cache for frequently accessed data
   - Tune Elasticsearch queries
   - Use CDN for static assets if needed
   - Enable gzip compression

---

For additional support, consult the main [README.md](../README.md) or create an issue.
