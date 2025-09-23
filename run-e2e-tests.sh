#!/bin/bash

# Python2IGCSE E2Eテスト実行スクリプト
# このスクリプトはPlaywrightテストを実行し、タイムアウトで自動終了します

# 色の定義
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

# デフォルト設定
TIMEOUT=120 # デフォルトタイムアウト（秒）
SERVER_PORT=8082 # ポート8081は既に使用されているため8082に変更
SERVER_PID=""

# ヘルプメッセージ
show_help() {
  echo -e "${YELLOW}使用方法:${NC} $0 [オプション]"
  echo -e "\nオプション:"
  echo -e "  ${GREEN}-t, --timeout${NC} <秒>    テスト実行のタイムアウト時間（デフォルト: ${TIMEOUT}秒）"
  echo -e "  ${GREEN}-p, --port${NC} <ポート>    HTTPサーバーのポート番号（デフォルト: ${SERVER_PORT}）"
  echo -e "  ${GREEN}-h, --help${NC}           このヘルプメッセージを表示"
  echo -e "\n例:"
  echo -e "  $0 --timeout 180 --port 8082\n"
}

# コマンドライン引数の解析
while [[ $# -gt 0 ]]; do
  case $1 in
    -t|--timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    -p|--port)
      SERVER_PORT="$2"
      shift 2
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo -e "${RED}エラー:${NC} 不明なオプション: $1"
      show_help
      exit 1
      ;;
  esac
done

# クリーンアップ関数
cleanup() {
  echo -e "\n${YELLOW}クリーンアップ中...${NC}"
  
  # HTTPサーバーを停止
  if [ ! -z "$SERVER_PID" ]; then
    echo -e "HTTPサーバー（PID: $SERVER_PID）を停止中..."
    kill -9 $SERVER_PID 2>/dev/null || true
  fi
  
  # Playwrightのブラウザプロセスを停止
  echo -e "Playwrightのブラウザプロセスを停止中..."
  pkill -f "playwright" 2>/dev/null || true
  
  echo -e "${GREEN}クリーンアップ完了${NC}"
}

# 終了時にクリーンアップを実行
trap cleanup EXIT

# HTTPサーバーの起動
echo -e "${YELLOW}HTTPサーバーをポート${SERVER_PORT}で起動中...${NC}"
npx http-server . -p $SERVER_PORT -c-1 &
SERVER_PID=$!

# サーバーの起動を待機
sleep 2

# サーバーが起動しているか確認
if ! curl -s http://localhost:$SERVER_PORT > /dev/null; then
  echo -e "${RED}エラー:${NC} HTTPサーバーの起動に失敗しました"
  exit 1
fi

echo -e "${GREEN}HTTPサーバーが起動しました（PID: $SERVER_PID）${NC}"

# テスト実行コマンド
echo -e "\n${YELLOW}E2Eテストを実行中...（タイムアウト: ${TIMEOUT}秒）${NC}"
echo -e "テスト終了後、自動的にプロセスが終了します\n"

# タイムアウト付きでテストを実行（macOSではgtimeoutを使用）
if command -v timeout &> /dev/null; then
  timeout $TIMEOUT npm run test:e2e
  TEST_EXIT_CODE=$?
elif command -v gtimeout &> /dev/null; then
  gtimeout $TIMEOUT npm run test:e2e
  TEST_EXIT_CODE=$?
else
  echo -e "${YELLOW}警告:${NC} timeoutコマンドが見つかりません。タイムアウトなしで実行します。"
  npm run test:e2e
  TEST_EXIT_CODE=$?
fi

# 結果の表示
if [ $TEST_EXIT_CODE -eq 124 ]; then
  echo -e "\n${RED}テストがタイムアウトしました（${TIMEOUT}秒）${NC}"
  exit 1
elif [ $TEST_EXIT_CODE -ne 0 ]; then
  echo -e "\n${RED}テストが失敗しました（終了コード: $TEST_EXIT_CODE）${NC}"
  exit $TEST_EXIT_CODE
else
  echo -e "\n${GREEN}テストが成功しました${NC}"
fi

# 正常終了
exit 0