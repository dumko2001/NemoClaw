#!/usr/bin/env bash
# Test inference.local routing through OpenShell provider (local vLLM).
# Also exercises the curated-model proxy path when PROXY_URL is set.

if [ -n "${PROXY_URL}" ]; then
  echo "=== Testing via policy-proxy at ${PROXY_URL} ==="

  echo "--- Nemotron 3 Super (curated) ---"
  curl -s "${PROXY_URL}/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${NVIDIA_API_KEY:-dummy}" \
    -d '{"model":"nvidia/nemotron-3-super-120b-a12b","messages":[{"role":"user","content":"say hello"}]}'
  echo -e "\n"

  echo "--- MiniMax M2.5 (curated, no extras) ---"
  curl -s "${PROXY_URL}/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${NVIDIA_API_KEY:-dummy}" \
    -d '{"model":"minimaxai/minimax-m2.5","messages":[{"role":"user","content":"say hello"}]}'
  echo -e "\n"
else
  echo "=== Testing via inference.local (OpenShell gateway) ==="
  echo '{"model":"nvidia/nemotron-3-nano-30b-a3b","messages":[{"role":"user","content":"say hello"}]}' > /tmp/req.json
  curl -s https://inference.local/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d @/tmp/req.json
  echo -e "\n"
fi
