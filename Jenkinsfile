pipeline {
    agent any

    environment {
        GROQ_API_KEY = credentials('GROQ_API_KEY')
    }

    stages {

        stage('Checkout') {
            steps {
                deleteDir()

                git branch: 'main',
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

                dir('backend') {

                    sh '''
                    railway link \
                    --project renewed-courtesy \
                    --environment production \
                    --service determined-cooperation
                    '''

                    sh 'railway up --detach'
                }
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
