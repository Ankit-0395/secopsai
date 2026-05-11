pipeline {
    agent any

    environment {
        GROQ_API_KEY = credentials('GROQ_API_KEY')
        RAILWAY_TOKEN = credentials('RAILWAY_TOKEN')
    }

    stages {
        stage('Checkout') {
            steps {
              git branch: 'main',
    credentialsId: 'github-creds',
    url: 'https://github.com/Ankit-0395/secopsai.git'
            }
        }

        stage('Build Backend') {
            steps {
                sh 'docker build -t secureopsai-backend ./backend'
            }
        }

        stage('Build Frontend') {
            steps {
                sh 'docker build -t secureopsai-frontend ./frontend'
            }
        }

        stage('Security Scan') {
            steps {
                sh 'docker run --rm secureopsai-backend bandit -r /app/main.py -f json || true'
            }
        }

        stage('Deploy to Railway') {
            steps {
                sh 'npm install -g @railway/cli'
               sh 'railway up --service determined-cooperation'
            }
        }
    }

    post {
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Build failed!'
        }
    }
}
