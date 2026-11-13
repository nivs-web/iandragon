#!/bin/bash
# 초고수 : 다시 맞춤 → 교차 검사(더 나은 구성이면 바꿈) → 아직 실패 · 바뀐 판만 다시 … (11/13 · 배포 엔진)
#   bash master-loop.sh <일꾼 수> <처음 목록 g,g,…> [바퀴 수=3]
cd "$(dirname "$0")"
W=$1; list=$2; R=${3:-3}
failing() { node report.js 2>/dev/null | grep "^- master " | awk '{split($3,a,"-"); printf "%s%d", (NR>1?",":""), (a[1]-1)*10+a[2]}'; }
tog() { grep SWAP "$1" | awk -F'[- ]' '{printf "%s%d", (NR>1?",":""), ($1-1)*10+$2}'; }
merge() { echo "$1,$2" | tr ',' '\n' | grep -v '^$' | sort -n | uniq | paste -sd, -; }
for r in $(seq 1 $R); do
  [ -z "$list" ] && break
  echo "== master $r 바퀴 : 다시 맞춤 $list ($(date +%H:%M:%S))"
  node runset.js refit.js master $W $list > rf-master-$r.out 2>&1
  node runset.js xcheck.js master $W $list > xc-master-$r.out 2>&1
  list=$(merge "$(failing)" "$(tog xc-master-$r.out)")
done
echo "== master 남은 실패 : $(failing) ($(date +%H:%M:%S))"
