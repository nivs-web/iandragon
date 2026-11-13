#!/bin/bash
# 남은 판 마무리 (11/13 · PC 규칙 : 한 번에 runset 하나 · 일꾼 2 · BelowNormal)
cd "$(dirname "$0")"
W=2
failing() { node report.js 2>/dev/null | grep "^- $1 " | awk '{split($3,a,"-"); printf "%s%d", (NR>1?",":""), (a[1]-1)*10+a[2]}'; }
tog() { grep SWAP "$1" | awk -F'[- ]' '{printf "%s%d", (NR>1?",":""), ($1-1)*10+$2}'; }
merge() { echo "$1,$2" | tr ',' '\n' | grep -v '^$' | sort -n | uniq | paste -sd, -; }
echo "== 시작 $(date +%H:%M:%S)"
# 어려움 : 시간 초과 패배가 걸린 판은 목표를 81% 로(지는 판 자체를 줄임) · 나머지는 78%
TG=0.81 node runset.js refit.js hard $W 33,34,36,39,84 > rf-hard-4.out 2>&1
node runset.js refit.js hard $W 38,98 >> rf-hard-4.out 2>&1
echo "== 어려움 1차 끝 : 남은 실패 $(failing hard) ($(date +%H:%M:%S))"
L=$(failing hard); [ -n "$L" ] && { node runset.js refit.js hard $W $L > rf-hard-5.out 2>&1; echo "== 어려움 2차 끝 : 남은 실패 $(failing hard) ($(date +%H:%M:%S))"; }
# 초고수 : 1-8 은 다시 맞춤이 끝났으니 교차 검사만 먼저
node runset.js xcheck.js master $W 8 > xc-master-0.out 2>&1
list=$(merge "$(failing master)" "$(tog xc-master-0.out)")
for r in 1 2 3; do
  [ -z "$list" ] && break
  echo "== 초고수 $r 바퀴 : 다시 맞춤 $list ($(date +%H:%M:%S))"
  node runset.js refit.js master $W $list > rf-master-f$r.out 2>&1
  node runset.js xcheck.js master $W $list > xc-master-f$r.out 2>&1
  list=$(merge "$(failing master)" "$(tog xc-master-f$r.out)")
done
echo "== 끝 : 어려움 실패 $(failing hard) · 초고수 실패 $(failing master) ($(date +%H:%M:%S))"
