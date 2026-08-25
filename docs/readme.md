# ARO Migration Hackathon Guide

## Overview

Welcome to the Azure Red Hat OpenShift (ARO) Migration Hackathon! 

In this challenge, you'll be migrating an "on-premises" application to ARO while implementing modern DevOps practices using GitHub. The goal is to modernize the application deployment, enhance security, and improve the overall development workflow.

## Prerequisites

Before starting, ensure you have:

1. An **Azure Account** with permissions to create resources
2. A **GitHub Account** 
3. **Docker** installed locally
4. **Azure CLI** installed
5. **Visual Studio Code** or your preferred IDE
6. **Git** installed
7. **Openshift CLI** installed (https://docs.redhat.com/en/documentation/openshift_container_platform/4.2/html/cli_tools/openshift-cli-oc#cli-about-cli_cli-developer-commands)

## Getting Started

### 1. Fork & Clone the Repository

1. **Fork the repository** to your GitHub account

2. Then clone:

```bash
git clone https://github.com/<yourname>/aro-migration-hackathon.git
cd aro-migration-hackathon
```

### 2. Set Up Azure Resources

We've provided an interactive script that will create all the necessary Azure resources for the hackathon:

```bash
# Make the script executable
chmod +x ./scripts/setup-azure-resources.sh
```

If using WSL then there may be a syntax error on the cluster creation. I would advise you use powershell instead with the following two commands:

```powershell
(Get-Content .\scripts\setup-azure-resources.sh -Raw) -replace "`r`n", "`n" | Set-Content .\scripts\setup-azure-resources.sh -NoNewline

bash ./scripts/setup-azure-resources.sh
```
```bash
# Run the setup script 
./scripts/setup-azure-resources.sh
```

This script will:
- Create a Resource Group
- Set up networking components
- Create an Azure Container Registry
- Optionally create an ARO cluster (or provide instructions for later creation)
- Save all configuration details to a `.env` file

## Understanding the Application

### 1. Application Architecture

The Task Manager application consists of:
- **Frontend**: React-based web UI
- **Backend API**: Node.js/Express 
- **Database**: MongoDB

### 2. Running Locally with Docker Compose
#### Understanding Docker Compose

Docker Compose is a tool for defining and running multi-container Docker applications. It uses a YAML file to configure your application's services and allows you to start all services with a single command.

#### Application Architecture

Our Task Manager application consists of three main components:

1. **Frontend**: React-based web UI served via Nginx
2. **Backend API**: Node.js/Express REST API
3. **Database**: MongoDB for data storage
4. **MongoDB Express**: Web-based MongoDB admin interface

```bash
cd on-prem-app/deployment
docker-compose up
```

Once the application is running, you can access:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:3001/api/tasks
- **MongoDB Express**: http://localhost:8081 

### 3. Exploring the Database (Optional)

1. Open MongoDB Express at http://localhost:8081. Default credentials are username: user and password: pass
2. Navigate through the interface to:
   - View the database structure
   - Create sample tasks
   - Modify existing data
   - Observe how changes affect the application

### 4. Testing the API (Optional)

You can use tools like cURL, Postman, or your browser to test the API:

```bash
# Get all tasks
curl http://localhost:3001/api/tasks

# Create a new task
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"New Task","description":"Task description","status":"pending"}'

# Update a task (replace TASK_ID with actual ID)
curl -X PUT http://localhost:3001/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'

# Delete a task (replace TASK_ID with actual ID)
curl -X DELETE http://localhost:3001/api/tasks/TASK_ID
```

## Hackathon Challenges

Your team will need to complete the following challenges:

### Challenge 1: Containerisation and ARO Deployment

1. **Build and push the container images** to your Azure Container Registry
2. **Deploy the application** to your ARO cluster using the provided Kubernetes manifests
3. **Configure routes** to expose the application externally
4. **Verify the deployment** and ensure it's working correctly

### PreReq: Set ACR value in your manifests

```bash
# Navigate back to the repository root
cd ../..


sed -i "s|\${REGISTRY_URL}/task-manager-backend|$REGISTRY_URL/task-manager-backend|g" aro-templates/manifests/backend-deployment.yaml
sed -i "s|\${REGISTRY_URL}/task-manager-frontend|$REGISTRY_URL/task-manager-frontend|g" aro-templates/manifests/frontend-deployment.yaml
```

Alternatively, you can edit the files manually:
1. Open `aro-templates/manifests/backend-deployment.yaml` and `frontend-deployment.yaml`
2. Find the line with `image: ${REGISTRY_URL}/task-manager-backend:latest` or similar
3. Replace with your actual ACR URL, e.g., `image: myacr.azurecr.io/taskmanager-backend:latest`

#### Option 1: Deploy Using the OpenShift CLI

##### Step 1: Build and Push Container Images

If running these commands in WSL please switch to powershell as your build arg may be passed through incorrectly. 

```bash
# Log in to your ACR. 
echo You may need to load your environment file using the command "source .env"

source .env
az acr login --name $ACR_NAME

# Navigate to the frontend directory
cd on-prem-app/frontend

# Build using the OpenShift-specific Dockerfile
docker build -t $ACR_NAME.azurecr.io/task-manager-frontend:latest --build-arg VITE_API_URL=/api -f Dockerfile.openshift .


# Push the frontend image
docker push $ACR_NAME.azurecr.io/task-manager-frontend:latest

# Navigate to the backend directory
cd ../backend

# Build and tag the backend image
docker build -t $ACR_NAME.azurecr.io/task-manager-backend:latest .

# Push the backend image
docker push $ACR_NAME.azurecr.io/task-manager-backend:latest
```

##### Step 2: Log in to ARO Using the CLI

```bash
# Log in to your ARO cluster through the UI
echo Login to the Openshift Portal here: $OPENSHIFT_CONSOLE_URL
echo You can find your username and password in your .env file. 

# Navigate to your username in the top right and select "copy login token"

# Login using the command provided with your token and server

oc login --token=********** --server=**********

```

##### Step 3: Create a Project (Namespace)

```bash
# Create a project for the application
oc new-project task-manager
```

##### Step 4: Create Image Pull Secret for ACR

```bash
# Create a secret for pulling images from ACR
oc create secret docker-registry acr-secret \
  --docker-server=$REGISTRY_URL \
  --docker-username=$REGISTRY_USERNAME \
  --docker-password=$REGISTRY_PASSWORD
  
# Link the secret to the service account
oc secrets link default acr-secret --for=pull

# Add security context constraints to allow service account to create frontend pod with custom security contexts for nginx.conf
oc adm policy add-scc-to-user anyuid -z default -n task-manager
```


##### Step 5: Update and Apply Kubernetes Manifests

```bash
# Edit the deployment manifests to use your ACR
# Replace ${YOUR_ACR_URL} with your actual ACR URL in the manifests

# Apply the manifests
cd ../..

oc apply -f aro-templates/manifests/mongodb-deployment.yaml
oc apply -f aro-templates/manifests/backend-deployment.yaml
oc apply -f aro-templates/manifests/frontend-deployment.yaml
```

##### Step 6: Verify the Deployment - CLI

```bash
# Check if pods are running
oc get pods

# Check the created routes
oc get routes

# Test the backend API and expect an empty response (Just no errors)
curl http://$(oc get route backend-api -o jsonpath='{.spec.host}')/api/tasks

# Open the frontend URL in your browser
echo "Frontend URL: http://$(oc get route frontend-route -o jsonpath='{.spec.host}')"
```
Now create a task and check the frontend has called the backend and put the entry in the db.
```bash

# Connect to MongoDB pod
MONGO_POD=$(kubectl get pods -l app=mongodb -o jsonpath='{.items[0].metadata.name}')

# Open MongoDB shell
kubectl exec -it $MONGO_POD -- mongosh taskmanager

# In the MongoDB shell, list all tasks
db.tasks.find().pretty()
```

##### Step 7: Verify the Deployment - UI

1. Navigate back to the Openshift Console and go to **Workloads > Pods** to see if all pods are running
2. Go to **Networking > Routes** to find URLs for your application
3. Open the frontend route URL in your browser
4. Test the application by creating, editing, and deleting tasks


### Challenge 2: GitHub CI/CD Pipeline

1. **Set up GitHub Actions** for continuous integration and deployment
2. **Configure GitHub Secrets** for secure pipeline execution
3. **Implement automated testing** in the pipeline
4. **Create a workflow** that deploys to ARO when changes are pushed to main

#### Setting up CI/CD for ARO Deployment

Your CI/CD pipeline will build and push your container image. We will also add some of our ARO cluster details as we may want to use them later!

You will need to add the following secrets from your env file to your repo.

**Required GitHub Secrets:**
- `REGISTRY_URL`: The URL of your Azure Container Registry (e.g., myregistry.azurecr.io)
- `REGISTRY_USERNAME`: Username for your container registry (usually the registry name)
- `REGISTRY_PASSWORD`: Password or access key for your container registry
- `OPENSHIFT_SERVER`: The API server URL of your ARO cluster
- `OPENSHIFT_TOKEN`: Authentication token for your ARO cluster (Found in Openshift Portal)

Your pipelines are triggered on commits, PR's or through manual triggers. 

**Advanced Deployment Options:**
- Consider using your pipeline to manage the app deployment not just the build. 
- Consider setting up multiple environments (dev, staging, production)
- Implement Blue/Green deployment for zero-downtime updates
- Add post-deployment health checks to verify successful deployment

### Challenge 3: Database Modernization with Azure Cosmos DB

While containerised MongoDB within ARO works for development, a production-ready architecture should leverage managed database services for better scalability, reliability, and operational efficiency. I rebuke containerised databases...

#### Your Challenge: Migrate to Azure Cosmos DB for MongoDB API

1. **Create an Azure Cosmos DB for MongoDB API**
2. **Update the backend application to connect to Cosmos DB**
3. **Commit changes to trigger CI pipeline image build**
4. **Deploy the updated application on ARO**

#### Step-by-Step Implementation Guide

##### 1. Create Azure Cosmos DB with MongoDB API

```bash
# Create MongoDB-compatible Cosmos DB account
az cosmosdb create \
  --name aro-task-manager-db \
  --resource-group $RESOURCE_GROUP \
  --kind MongoDB \
  --capabilities EnableMongo \
  --server-version 4.0 \
  --default-consistency-level Session


# Get the connection string
CONNECTION_STRING=$(az cosmosdb keys list \
  --name aro-task-manager-db \
  --resource-group $RESOURCE_GROUP \
  --type connection-strings \
  --query "connectionStrings[?description=='Primary MongoDB Connection String'].connectionString" -o tsv)

echo "Connection string: $CONNECTION_STRING"
```

##### 2. Update Backend Application Code (potentially a copilot opp here!)

Modify `backend/src/server.js` to handle Cosmos DB connections:

```javascript
// DB Connection
const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanager';
const DB_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ...(process.env.MONGODB_URI?.includes('cosmos.azure.com') ? {
    // Cosmos DB specific options
    retryWrites: false,
    ssl: true,
    tlsAllowInvalidCertificates: false,
  } : {})
};

mongoose.connect(DB_URI, DB_OPTIONS)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));
```

##### 3. Commit and Push Changes

Commit your backend code changes to trigger the CI pipeline:

```bash
# Add your changes
git add backend/src/server.js

# Commit with a descriptive message
git commit -m "Update backend to support Azure Cosmos DB"

# Push to trigger CI pipeline
git push origin main
```

Wait for your CI pipeline to complete and build a new container image.

##### 4. Create a Kubernetes Secret for the Connection String

```bash
# Create a secret for the MongoDB connection string
oc create secret generic mongodb-credentials \
  --namespace task-manager \
  --from-literal=connection-string="$CONNECTION_STRING"
```

##### 5. Update and Apply Kubernetes Manifests

Create a new file called `backend-deployment-cosmos.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: task-manager
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      containers:
      - name: backend-api
        image: ${YOUR_ACR_URL}/taskmanager-backend:latest  # Will use the latest image built by CI
        ports:
        - containerPort: 3001
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-credentials
              key: connection-string
        - name: PORT
          value: "3001"
```

Apply the updated deployment:

```bash
# Delete the existing backend API deployment
kubectl delete deployment backend-api

# Replace ${YOUR_ACR_URL} with your actual ACR URL
sed "s|\${YOUR_ACR_URL}|$ACR_LOGIN_SERVER|g" backend-deployment-cosmos.yaml | oc apply -f -

# Scale down MongoDB (optional - you can keep it running as a fallback)
oc scale deployment mongodb --replicas=0 -n task-manager
```

##### 6. Verify the Application is Working

1. Check that the backend pod is running with the updated configuration:
   ```bash
   oc get pods -n task-manager
   ```

2. View the backend logs to confirm it's connecting to Cosmos DB:
   ```bash
   oc logs -f deployment/backend -n task-manager
   ```

3. Test the application functionality to ensure data operations work correctly.

#### Benefits of This Migration

- **Reduced Cluster Resource Usage**: No MongoDB pods in your ARO cluster
- **Improved Reliability**: Azure's 99.99% SLA for Cosmos DB
- **Automatic Scaling**: Cosmos DB scales throughput based on demand
- **Global Distribution**: Option to distribute data globally if needed
- **Security Improvements**: Managed encryption at rest and in transit

### Challenge 4: GitHub Copilot Integration

1. **Enable GitHub Copilot** in your development environment
2. **Use Copilot to add a new feature** to the application. Some ideas:
   - Task search functionality
   - Task categories or tags
   - Due date reminders
   - User authentication
3. **Document how Copilot assisted** in the development process

### Challenge 5: GitHub AI Models

1. **Use GitHub AI Models** to:
   - Generate documentation for your code
   - Create useful comments
   - Explain complex sections of the codebase
   - Suggest optimizations or improvements
2. **Compare the suggestions** against the original code
3. **Implement at least one improvement** suggested by the AI

### Challenge 6: GitHub Advanced Security

1. **Enable GitHub Advanced Security** features:
   - Code scanning with CodeQL
   - Dependency scanning
   - Secret scanning
2. **Add security scanning** to your CI/CD pipeline
3. **Address any security issues** identified by the scans
4. **Implement dependency management** best practices

### Challenge 7: Monitoring and Observability

1. **Set up basic monitoring** for your application in ARO
2. **Implement logging** and configure log aggregation
3. **Create at least one dashboard** to visualize application performance
4. **Configure alerts** for critical metrics

## Resources

- [Azure Red Hat OpenShift Documentation](https://learn.microsoft.com/en-us/azure/openshift/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [GitHub Advanced Security](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security)
- [OpenShift Developer Documentation](https://docs.openshift.com/container-platform/4.10/welcome/index.html)

## Getting Help

If you encounter issues during the hackathon, please reach out to the mentors who will be available to assist you.

Good luck and happy hacking!