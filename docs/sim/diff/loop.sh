#!/bin/bash
# 교차 검사 → 더 나은 구성이 나온 판만 다시 맞춤 → 그 판만 다시 교차 검사 … (최대 4번) → 마지막은 재기만(XV=1)
#   bash loop.sh <꼬리표> <일꾼 수> <판 목록 g,g,…> [refit = 첫 교차 검사는 이미 했으니 다시 맞춤부터]
tag=$1; W=$2; list=$3; first=$4
tog() { grep SWAP "$1" | awk -F'[- ]' '{printf "%s%d", (NR>1?",":""), ($1-1)*10+$2}'; }
for r in 1 2 3 4; do
  if [ "$r" != 1 ] || [ "$first" != refit ]; then
    node runset.js xcheck.js master $W $list > xc-$tag-$r.out 2>&1
    list=$(tog xc-$tag-$r.out)
  fi
  [ -z "$list" ] && break
  echo "== $tag $r 회 : 다시 맞춤 $list"
  node runset.js refit.js master $W $list > rf-$tag-$r.out 2>&1
done
if [ -n "$list" ]; then XV=1 node runset.js xcheck.js master $W $list > xc-$tag-v.out 2>&1; fi
echo "== $tag loop 끝 $(date +%H:%M:%S)"
