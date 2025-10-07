#!/bin/bash

# 服务器部署脚本

set -e  # 遇到错误立即退出

echo "🚀 开始部署项目..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_NAME="nextjs-app"
SERVER_USER="your-username"
SERVER_HOST="your-server-ip"
SERVER_PATH="/var/www/app"
BACKUP_DIR="/var/backups/app"

# 函数：打印彩色日志
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 函数：构建测试版
build_test() {
    log_info "构建测试版..."
    
    # 复制测试环境配置
    cp .env.test .env.local
    
    # 构建
    npm run build:test
    
    log_success "测试版构建完成"
}

# 函数：构建生产版
build_production() {
    log_info "构建生产版..."
    
    # 复制生产环境配置
    cp .env.production .env.local
    
    # 构建
    npm run build:production
    
    log_success "生产版构建完成"
}

# 函数：创建部署包
create_deployment_package() {
    local env=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local package_name="${PROJECT_NAME}_${env}_${timestamp}.tar.gz"
    
    log_info "创建部署包: $package_name"
    
    # 创建部署目录
    mkdir -p deploy
    
    # 打包必要文件
    tar -czf "deploy/$package_name" \
        .next/ \
        public/ \
        package.json \
        package-lock.json \
        next.config.ts \
        .env.$env \
        ecosystem.config.json \
        --exclude=node_modules
    
    log_success "部署包创建完成: deploy/$package_name"
    echo "deploy/$package_name"
}

# 函数：部署到服务器
deploy_to_server() {
    local package_path=$1
    local env=$2
    
    log_info "部署到服务器 ($env 环境)..."
    
    # 上传部署包
    scp "$package_path" $SERVER_USER@$SERVER_HOST:/tmp/
    
    # 在服务器上执行部署
    ssh $SERVER_USER@$SERVER_HOST << EOF
        set -e
        
        # 创建目录
        sudo mkdir -p $SERVER_PATH/$env
        sudo mkdir -p $BACKUP_DIR
        sudo mkdir -p $SERVER_PATH/$env/logs
        
        # 备份当前版本
        if [ -d "$SERVER_PATH/$env/.next" ]; then
            sudo tar -czf $BACKUP_DIR/backup_${env}_\$(date +%Y%m%d_%H%M%S).tar.gz -C $SERVER_PATH/$env .
        fi
        
        # 解压新版本
        cd $SERVER_PATH/$env
        sudo tar -xzf /tmp/$(basename $package_path)
        
        # 安装依赖（如果没有node_modules）
        if [ ! -d "node_modules" ]; then
            sudo npm ci --production
        fi
        
        # 复制环境配置文件
        sudo cp .env.$env .env.local
        
        # 设置权限
        sudo chown -R $SERVER_USER:$SERVER_USER $SERVER_PATH/$env
        
        # 重启服务
        if pm2 list | grep -q "app-$env"; then
            pm2 restart app-$env
        else
            pm2 start ecosystem.config.json --only app-$env
        fi
        
        # 清理临时文件
        rm -f /tmp/$(basename $package_path)
EOF
    
    log_success "部署完成!"
    log_info "测试版访问地址: http://$SERVER_HOST:3001"
    log_info "生产版访问地址: http://$SERVER_HOST:3000"
}

# 主程序
case "$1" in
    "test")
        log_info "开始测试版部署流程..."
        build_test
        package_path=$(create_deployment_package "test")
        deploy_to_server "$package_path" "test"
        ;;
    "production")
        log_info "开始生产版部署流程..."
        build_production
        package_path=$(create_deployment_package "production")
        deploy_to_server "$package_path" "production"
        ;;
    "local-test")
        log_info "本地构建测试版..."
        build_test
        log_success "测试版构建完成，使用 'npm run start:test' 启动"
        ;;
    "local-production")
        log_info "本地构建生产版..."
        build_production
        log_success "生产版构建完成，使用 'npm run start:production' 启动"
        ;;
    *)
        echo "使用方法: $0 {test|production|local-test|local-production}"
        echo ""
        echo "  test             - 构建并部署测试版到服务器"
        echo "  production       - 构建并部署生产版到服务器"
        echo "  local-test       - 仅本地构建测试版"
        echo "  local-production - 仅本地构建生产版"
        exit 1
        ;;
esac