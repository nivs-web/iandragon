#!/bin/bash
# 합격선 밖인 판만 다시 맞추기를 되풀이 (11/13 · 배포 엔진) :  bash refit-loop.sh <hard|master> <일꾼 수> [바퀴 수=3]
# 판정은 report.js 그대로. 바퀴마다 refit.js 가 새 씨앗(7000 + 200 × 회차)을 쓴다.
cd "$(dirname "$0")"
mode=$1; W=$2; R=${3:-3}
failing() { node report.js 2>/dev/null | grep "^- $mode " | awk '{split($3,a,"-"); printf "%s%d", (NR>1?",":""), (a[1]-1)*10+a[2]}'; }
for r in $(seq 1 $R); do
  list=$(failing)
  [ -z "$list" ] && break
  echo "== $mode $r 바퀴 : 다시 맞춤 $list ($(date +%H:%M:%S))"
  node runset.js refit.js $mode $W $list > rf-$mode-$r.out 2>&1
done
echo "== $mode 남은 실패 : $(failing) ($(date +%H:%M:%S))"
