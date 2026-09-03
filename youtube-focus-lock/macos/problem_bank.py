#!/usr/bin/env python3
"""Original objective algorithm problem bank for YouTube Focus Lock.

120 problems = 24 algorithm families x 5 wording/constraint variants.
No prompts are copied from LeetCode or another problem site.
"""
from __future__ import annotations

import bisect
import heapq
import random
from collections import Counter, defaultdict, deque

VARIANTS_PER_FAMILY = 5


def _prefix_sum(nums, target):
    total = 0
    prefix = 0
    counts = {0: 1}
    for x in nums:
        prefix += x
        total += counts.get(prefix - target, 0)
        counts[prefix] = counts.get(prefix, 0) + 1
    return total


def _bounded_window(nums, limit):
    maxq, minq = deque(), deque()
    left = best = 0
    for right, value in enumerate(nums):
        while maxq and nums[maxq[-1]] < value:
            maxq.pop()
        while minq and nums[minq[-1]] > value:
            minq.pop()
        maxq.append(right)
        minq.append(right)
        while nums[maxq[0]] - nums[minq[0]] > limit:
            if maxq[0] == left:
                maxq.popleft()
            if minq[0] == left:
                minq.popleft()
            left += 1
        best = max(best, right - left + 1)
    return best


def _meeting_rooms(intervals):
    events = []
    for start, end in intervals:
        events.append((start, 1))
        events.append((end, -1))
    active = best = 0
    for _, delta in sorted(events, key=lambda e: (e[0], e[1])):
        active += delta
        best = max(best, active)
    return best


def _top_k_words(words, k):
    counts = Counter(words)
    return sorted(counts, key=lambda w: (-counts[w], w))[:k]


def _merge_intervals(intervals):
    if not intervals:
        return []
    rows = sorted([list(x) for x in intervals])
    out = [rows[0]]
    for start, end in rows[1:]:
        if start <= out[-1][1]:
            out[-1][1] = max(out[-1][1], end)
        else:
            out.append([start, end])
    return out


def _longest_k_distinct(text, k):
    if k <= 0:
        return 0
    counts = defaultdict(int)
    left = best = 0
    for right, ch in enumerate(text):
        counts[ch] += 1
        while len(counts) > k:
            c = text[left]
            counts[c] -= 1
            if counts[c] == 0:
                del counts[c]
            left += 1
        best = max(best, right - left + 1)
    return best


def _components(n, edges):
    parent = list(range(n))
    rank = [0] * n

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra == rb:
            return
        if rank[ra] < rank[rb]:
            ra, rb = rb, ra
        parent[rb] = ra
        if rank[ra] == rank[rb]:
            rank[ra] += 1

    for a, b in edges:
        union(a, b)
    return len({find(i) for i in range(n)})


def _course_possible(n, prerequisites):
    graph = [[] for _ in range(n)]
    indeg = [0] * n
    for course, prereq in prerequisites:
        graph[prereq].append(course)
        indeg[course] += 1
    q = deque(i for i, d in enumerate(indeg) if d == 0)
    seen = 0
    while q:
        node = q.popleft()
        seen += 1
        for nxt in graph[node]:
            indeg[nxt] -= 1
            if indeg[nxt] == 0:
                q.append(nxt)
    return seen == n


def _min_coins(coins, amount):
    inf = amount + 1
    dp = [0] + [inf] * amount
    for x in range(1, amount + 1):
        for coin in coins:
            if coin <= x:
                dp[x] = min(dp[x], dp[x - coin] + 1)
    return -1 if dp[amount] == inf else dp[amount]


def _lis_length(nums):
    tails = []
    for x in nums:
        i = bisect.bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)


def _kth_largest(nums, k):
    return sorted(nums, reverse=True)[k - 1]


def _daily_temperatures(temps):
    ans = [0] * len(temps)
    stack = []
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            ans[j] = i - j
        stack.append(i)
    return ans


def _one_break_path(grid):
    rows, cols = len(grid), len(grid[0])
    start_used = grid[0][0]
    if start_used > 1:
        return -1
    q = deque([(0, 0, start_used, 0)])
    seen = {(0, 0, start_used)}
    while q:
        r, c, used, dist = q.popleft()
        if (r, c) == (rows - 1, cols - 1):
            return dist
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                nu = used + grid[nr][nc]
                state = (nr, nc, nu)
                if nu <= 1 and state not in seen:
                    seen.add(state)
                    q.append((nr, nc, nu, dist + 1))
    return -1


def _pair_distance(nums, k):
    nums = sorted(nums)
    lo, hi = 0, nums[-1] - nums[0]
    while lo < hi:
        mid = (lo + hi) // 2
        count = left = 0
        for right, x in enumerate(nums):
            while x - nums[left] > mid:
                left += 1
            count += right - left
        if count >= k:
            hi = mid
        else:
            lo = mid + 1
    return lo


def _weighted_schedule(jobs):
    rows = sorted(jobs, key=lambda x: x[1])
    ends = [x[1] for x in rows]
    dp = [0] * (len(rows) + 1)
    for i, (start, _end, value) in enumerate(rows, 1):
        j = bisect.bisect_right(ends, start, 0, i - 1)
        dp[i] = max(dp[i - 1], dp[j] + value)
    return dp[-1]


def _mountain_removals(nums):
    n = len(nums)
    lis = [1] * n
    lds = [1] * n
    for i in range(n):
        for j in range(i):
            if nums[j] < nums[i]:
                lis[i] = max(lis[i], lis[j] + 1)
    for i in range(n - 1, -1, -1):
        for j in range(i + 1, n):
            if nums[j] < nums[i]:
                lds[i] = max(lds[i], lds[j] + 1)
    best = max((lis[i] + lds[i] - 1 for i in range(n) if lis[i] > 1 and lds[i] > 1), default=0)
    return n - best if best else n


def _edit_distance(a, b):
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(cur[-1] + 1, prev[j] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def _min_window(s, t):
    if not t:
        return ""
    need = Counter(t)
    missing = len(t)
    left = 0
    best = None
    for right, ch in enumerate(s):
        if need[ch] > 0:
            missing -= 1
        need[ch] -= 1
        while missing == 0:
            candidate = (right - left + 1, left, right + 1)
            if best is None or candidate < best:
                best = candidate
            c = s[left]
            need[c] += 1
            if need[c] > 0:
                missing += 1
            left += 1
    return "" if best is None else s[best[1]:best[2]]


def _longest_increasing_path(matrix):
    rows, cols = len(matrix), len(matrix[0])
    memo = {}

    def dfs(r, c):
        key = (r, c)
        if key in memo:
            return memo[key]
        best = 1
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > matrix[r][c]:
                best = max(best, 1 + dfs(nr, nc))
        memo[key] = best
        return best

    return max(dfs(r, c) for r in range(rows) for c in range(cols))


def _circular_max(nums):
    total = sum(nums)
    cur_max = best_max = nums[0]
    cur_min = best_min = nums[0]
    for x in nums[1:]:
        cur_max = max(x, cur_max + x)
        best_max = max(best_max, cur_max)
        cur_min = min(x, cur_min + x)
        best_min = min(best_min, cur_min)
    if best_max < 0:
        return best_max
    return max(best_max, total - best_min)


def _minimum_effort(heights):
    rows, cols = len(heights), len(heights[0])
    dist = [[10**18] * cols for _ in range(rows)]
    dist[0][0] = 0
    heap = [(0, 0, 0)]
    while heap:
        effort, r, c = heapq.heappop(heap)
        if effort != dist[r][c]:
            continue
        if (r, c) == (rows - 1, cols - 1):
            return effort
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                ne = max(effort, abs(heights[nr][nc] - heights[r][c]))
                if ne < dist[nr][nc]:
                    dist[nr][nc] = ne
                    heapq.heappush(heap, (ne, nr, nc))
    return 0


def _lps(s):
    n = len(s)
    if n == 0:
        return 0
    dp = [[0] * n for _ in range(n)]
    for i in range(n - 1, -1, -1):
        dp[i][i] = 1
        for j in range(i + 1, n):
            if s[i] == s[j]:
                dp[i][j] = 2 + (dp[i + 1][j - 1] if i + 1 <= j - 1 else 0)
            else:
                dp[i][j] = max(dp[i + 1][j], dp[i][j - 1])
    return dp[0][n - 1]


def _distinct_subseq(s, t):
    dp = [0] * (len(t) + 1)
    dp[0] = 1
    for ch in s:
        for j in range(len(t) - 1, -1, -1):
            if ch == t[j]:
                dp[j + 1] += dp[j]
    return dp[-1]


def _palindrome_min_cut(s):
    n = len(s)
    if n <= 1:
        return 0
    pal = [[False] * n for _ in range(n)]
    cuts = list(range(n))
    for end in range(n):
        for start in range(end + 1):
            if s[start] == s[end] and (end - start <= 2 or pal[start + 1][end - 1]):
                pal[start][end] = True
                cuts[end] = 0 if start == 0 else min(cuts[end], cuts[start - 1] + 1)
    return cuts[-1]


FAMILIES = [
    dict(key="prefix-sum", difficulty="Medium", title="Target-sum subarrays", function="count_target_subarrays", reference=_prefix_sum,
         prompt="Return the number of contiguous subarrays whose sum equals target. Values may be negative.",
         hints=["A running prefix sum lets each position ask how many earlier prefixes differ by target.", "Store prefix-sum frequencies, not just whether a prefix has appeared."],
         concepts=["prefix sums", "hash map"]),
    dict(key="bounded-window", difficulty="Medium", title="Longest bounded range", function="longest_bounded_window", reference=_bounded_window,
         prompt="Return the longest contiguous window where max(window) - min(window) <= limit.",
         hints=["A sliding window is useful, but recomputing min/max each step is too slow.", "Two monotonic deques can track the window minimum and maximum."],
         concepts=["sliding window", "monotonic deque"]),
    dict(key="meeting-rooms", difficulty="Medium", title="Concurrent room capacity", function="minimum_rooms", reference=_meeting_rooms,
         prompt="Intervals are half-open [start, end). Return the minimum number of rooms needed so no meetings overlap in a room.",
         hints=["Turn each start/end into an event and sweep in time order.", "At an equal timestamp, process an ending before a starting because intervals are half-open."],
         concepts=["sweep line", "sorting"]),
    dict(key="top-k-words", difficulty="Medium", title="Rank frequent words", function="top_k_frequent_words", reference=_top_k_words,
         prompt="Return the k most frequent words. Sort by descending frequency, then lexicographically ascending on ties.",
         hints=["Count first, then define the exact tie-breaking order.", "Sorting unique words by (-frequency, word) is sufficient for these constraints."],
         concepts=["counting", "sorting"]),
    dict(key="merge-intervals", difficulty="Medium", title="Coalesce ranges", function="merge_intervals", reference=_merge_intervals,
         prompt="Merge all overlapping or touching closed intervals and return the merged intervals sorted by start.",
         hints=["Sort intervals by start before attempting to merge.", "Only the last merged interval can overlap the next sorted interval."],
         concepts=["sorting", "intervals"]),
    dict(key="k-distinct-window", difficulty="Medium", title="Longest substring with k symbols", function="longest_k_distinct", reference=_longest_k_distinct,
         prompt="Return the longest substring containing at most k distinct characters.",
         hints=["Grow a right pointer and maintain character frequencies in the current window.", "Shrink from the left only while the distinct-count constraint is violated."],
         concepts=["sliding window", "frequency map"]),
    dict(key="components", difficulty="Medium", title="Count graph components", function="connected_components", reference=_components,
         prompt="Given n nodes labeled 0..n-1 and undirected edges, return the number of connected components.",
         hints=["Either graph traversal or disjoint-set union works.", "If using union-find, count distinct roots after all unions."],
         concepts=["graphs", "union find"]),
    dict(key="course-cycle", difficulty="Medium", title="Dependency feasibility", function="can_finish_all", reference=_course_possible,
         prompt="Each pair [course, prerequisite] is a directed dependency. Return True iff every course can be completed.",
         hints=["The question is equivalent to asking whether the directed graph is acyclic.", "Kahn's algorithm removes zero-indegree nodes; if all nodes are removed, there is no cycle."],
         concepts=["topological sort", "graphs"]),
    dict(key="coin-change", difficulty="Medium", title="Minimum coin count", function="minimum_coins", reference=_min_coins,
         prompt="Given positive coin denominations and an amount, return the minimum number of coins needed, or -1 if impossible.",
         hints=["Consider the best answer for every smaller amount up to the target.", "For each amount x, try every coin c <= x and extend the solution for x-c."],
         concepts=["dynamic programming"]),
    dict(key="lis", difficulty="Medium", title="Strictly increasing subsequence", function="lis_length", reference=_lis_length,
         prompt="Return the length of the longest strictly increasing subsequence.",
         hints=["A quadratic DP works for small inputs, but there is also an O(n log n) tails technique.", "For the tails technique, replace the first tail >= x using binary search."],
         concepts=["binary search", "dynamic programming"]),
    dict(key="kth-largest", difficulty="Medium", title="Kth largest value", function="kth_largest", reference=_kth_largest,
         prompt="Return the kth largest element of nums, counting duplicates as separate positions.",
         hints=["Sorting is acceptable for these constraints; a heap/selection approach also works.", "Be careful that k is 1-indexed."],
         concepts=["sorting", "heap"]),
    dict(key="daily-temperatures", difficulty="Medium", title="Next warmer day", function="days_until_warmer", reference=_daily_temperatures,
         prompt="For each temperature, return how many days until a strictly warmer temperature; use 0 if none exists.",
         hints=["Keep unresolved indices whose temperatures have not yet found a warmer future day.", "A decreasing monotonic stack makes each index enter and leave the stack once."],
         concepts=["monotonic stack"]),
    dict(key="one-break-path", difficulty="Hard", title="Grid path with one wall break", function="shortest_path_one_break", reference=_one_break_path,
         prompt="In a 0/1 grid, return the shortest 4-direction path length from top-left to bottom-right when at most one wall cell (1) may be entered. Return -1 if impossible.",
         hints=["Your BFS state needs more than just (row, col).", "Track whether the one allowed wall break has already been used."],
         concepts=["BFS", "state expansion"]),
    dict(key="pair-distance", difficulty="Hard", title="Kth pair distance", function="kth_smallest_pair_distance", reference=_pair_distance,
         prompt="Return the kth smallest absolute difference among all unordered index pairs.",
         hints=["Sort nums and binary-search the answer distance rather than enumerating every pair.", "For a candidate distance d, count pairs with distance <= d using a moving left pointer."],
         concepts=["binary search on answer", "two pointers"]),
    dict(key="weighted-schedule", difficulty="Hard", title="Maximum weighted schedule", function="max_non_overlapping_value", reference=_weighted_schedule,
         prompt="Each job is [start, end, value] with half-open timing. Return the maximum total value from non-overlapping jobs.",
         hints=["Sort by end time and build a DP over prefixes of that order.", "Binary search for the last job ending <= the current job's start."],
         concepts=["dynamic programming", "binary search"]),
    dict(key="mountain-removals", difficulty="Hard", title="Minimum mountain removals", function="minimum_mountain_removals", reference=_mountain_removals,
         prompt="Return the minimum removals needed so the remaining sequence is strictly increasing then strictly decreasing, with both sides non-empty.",
         hints=["Treat each index as a possible peak and ask for increasing/decreasing subsequence lengths around it.", "A valid peak needs an increasing length >1 on the left and a decreasing length >1 on the right."],
         concepts=["LIS", "dynamic programming"]),
    dict(key="edit-distance", difficulty="Hard", title="String edit distance", function="edit_distance", reference=_edit_distance,
         prompt="Return the minimum insertions, deletions, and single-character substitutions needed to transform a into b.",
         hints=["Define DP[i][j] as the cost to transform prefixes a[:i] and b[:j].", "When the last characters differ, consider insert, delete, and replace from neighboring states."],
         concepts=["2D dynamic programming"]),
    dict(key="minimum-window", difficulty="Hard", title="Minimum covering window", function="minimum_covering_window", reference=_min_window,
         prompt="Return the shortest substring of s containing every character of t with multiplicity. If tied, return the leftmost. Return '' if impossible.",
         hints=["A frequency deficit map plus a sliding window can track when all required characters are covered.", "Once covered, shrink from the left as far as possible before advancing the right side."],
         concepts=["sliding window", "frequency map"]),
    dict(key="increasing-path", difficulty="Hard", title="Longest increasing matrix path", function="longest_increasing_path", reference=_longest_increasing_path,
         prompt="Return the maximum length of a 4-direction path in a matrix where each next value is strictly larger.",
         hints=["The strict increase means path transitions form a DAG even though the grid itself has cycles.", "Memoized DFS from each cell avoids recomputing the best suffix path."],
         concepts=["DFS", "memoization"]),
    dict(key="circular-subarray", difficulty="Hard", title="Maximum circular subarray", function="max_circular_subarray", reference=_circular_max,
         prompt="Return the maximum sum of a non-empty contiguous subarray when nums is circular.",
         hints=["The best circular answer is either a normal max subarray or total_sum - minimum_subarray.", "Handle the all-negative case separately so you do not accidentally choose an empty wrapped subarray."],
         concepts=["Kadane", "case analysis"]),
    dict(key="minimum-effort", difficulty="Hard", title="Minimum-effort grid route", function="minimum_effort_path", reference=_minimum_effort,
         prompt="Path effort is the maximum absolute height difference across any step. Return the minimum possible effort from top-left to bottom-right.",
         hints=["This is a minimax shortest-path problem rather than a sum-of-weights shortest path.", "Dijkstra works if the path cost to a neighbor is max(current_effort, edge_difference)."],
         concepts=["Dijkstra", "minimax path"]),
    dict(key="pal-subsequence", difficulty="Hard", title="Longest palindromic subsequence", function="longest_palindromic_subsequence", reference=_lps,
         prompt="Return the length of the longest subsequence of s that is a palindrome.",
         hints=["Use intervals: ask for the best palindrome inside s[i:j+1].", "Matching endpoints can contribute 2; otherwise drop one endpoint and take the better result."],
         concepts=["interval DP"]),
    dict(key="distinct-subseq", difficulty="Hard", title="Count target subsequences", function="count_target_subsequences", reference=_distinct_subseq,
         prompt="Return the number of distinct index-subsequences of s whose characters equal t.",
         hints=["Process s left-to-right while tracking how many ways each prefix of t can be formed.", "Update t positions backward so one source character is not reused within the same iteration."],
         concepts=["dynamic programming", "counting"]),
    dict(key="palindrome-cuts", difficulty="Hard", title="Minimum palindrome cuts", function="minimum_palindrome_cuts", reference=_palindrome_min_cut,
         prompt="Return the minimum number of cuts needed to partition s into palindromic substrings.",
         hints=["Precompute or incrementally discover which substrings are palindromes.", "For every palindrome ending at index r, combine it with the best cut count before its start."],
         concepts=["interval DP", "palindromes"]),
]

FAMILY_BY_KEY = {f["key"]: f for f in FAMILIES}


def _variant_prompt(base, variant):
    tails = [
        "Focus on correctness for edge cases as well as the main case.",
        "Inputs include duplicates and boundary-shaped cases.",
        "The hidden tests emphasize off-by-one and empty-transition mistakes.",
        "Prefer an algorithm that scales to the stated generator sizes.",
        "The judge includes randomized adversarial cases in addition to examples.",
    ]
    return base + " " + tails[variant - 1]


def all_problem_specs():
    out = []
    for family in FAMILIES:
        for variant in range(1, VARIANTS_PER_FAMILY + 1):
            out.append({
                "id": "%s-v%d" % (family["key"], variant),
                "family": family["key"],
                "variant": variant,
                "difficulty": family["difficulty"],
                "title": "%s · Variant %d" % (family["title"], variant),
                "function": "%s_v%d" % (family["function"], variant),
                "prompt": _variant_prompt(family["prompt"], variant),
                "reference": family["reference"],
                "hints": list(family["hints"]),
                "concepts": list(family["concepts"]),
            })
    return out


PROBLEM_SPECS = all_problem_specs()
PROBLEM_BY_ID = {p["id"]: p for p in PROBLEM_SPECS}


def select_challenge(rng=None):
    """Return 5 unique-family problems: 3 Medium + 2 Hard."""
    rng = rng or random.SystemRandom()
    medium = [f for f in FAMILIES if f["difficulty"] == "Medium"]
    hard = [f for f in FAMILIES if f["difficulty"] == "Hard"]
    families = rng.sample(medium, 3) + rng.sample(hard, 2)
    rng.shuffle(families)
    chosen = []
    for family in families:
        variant = rng.randint(1, VARIANTS_PER_FAMILY)
        chosen.append(PROBLEM_BY_ID["%s-v%d" % (family["key"], variant)])
    return chosen


def generated_cases(problem_id, seed):
    spec = PROBLEM_BY_ID[problem_id]
    family = spec["family"]
    rng = random.Random((int(seed) << 3) ^ spec["variant"])
    cases = []

    if family == "prefix-sum":
        cases = [([1, 1, 1], 2), ([1, -1, 0], 0)]
        for _ in range(18):
            n = rng.randint(3, 36)
            cases.append(([rng.randint(-7, 7) for _ in range(n)], rng.randint(-12, 12)))
    elif family == "bounded-window":
        cases = [([8, 2, 4, 7], 4), ([10, 1, 2, 4, 7, 2], 5)]
        for _ in range(18):
            cases.append(([rng.randint(0, 60) for _ in range(rng.randint(4, 55))], rng.randint(0, 20)))
    elif family == "meeting-rooms":
        cases = [([[0, 30], [5, 10], [15, 20]],), ([[1, 2], [2, 3]],)]
        for _ in range(18):
            rows = []
            for _ in range(rng.randint(3, 30)):
                s = rng.randint(0, 80)
                rows.append([s, s + rng.randint(1, 20)])
            cases.append((rows,))
    elif family == "top-k-words":
        cases = [(["i", "love", "code", "i", "love", "python"], 2), (["a", "b", "a", "c", "b", "a"], 3)]
        vocab = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta"]
        for _ in range(18):
            words = [rng.choice(vocab) for _ in range(rng.randint(8, 60))]
            cases.append((words, rng.randint(1, len(set(words)))))
    elif family == "merge-intervals":
        cases = [([[1, 3], [2, 6], [8, 10]],), ([[1, 4], [4, 5]],)]
        for _ in range(18):
            rows = []
            for _ in range(rng.randint(0, 24)):
                s = rng.randint(0, 50)
                rows.append([s, s + rng.randint(0, 15)])
            cases.append((rows,))
    elif family == "k-distinct-window":
        cases = [("eceba", 2), ("aa", 1)]
        alphabet = "abcdefg"
        for _ in range(18):
            text = "".join(rng.choice(alphabet) for _ in range(rng.randint(0, 45)))
            cases.append((text, rng.randint(0, 6)))
    elif family == "components":
        cases = [(5, [[0, 1], [1, 2], [3, 4]]), (4, [])]
        for _ in range(18):
            n = rng.randint(1, 18)
            edges = []
            for a in range(n):
                for b in range(a + 1, n):
                    if rng.random() < 0.12:
                        edges.append([a, b])
            cases.append((n, edges))
    elif family == "course-cycle":
        cases = [(2, [[1, 0]]), (2, [[1, 0], [0, 1]])]
        for _ in range(18):
            n = rng.randint(1, 16)
            edges = []
            for a in range(n):
                for b in range(n):
                    if a != b and rng.random() < 0.06:
                        edges.append([a, b])
            cases.append((n, edges))
    elif family == "coin-change":
        cases = [([1, 2, 5], 11), ([2], 3)]
        for _ in range(18):
            coins = sorted(set(rng.randint(1, 15) for _ in range(rng.randint(1, 6))))
            cases.append((coins, rng.randint(0, 90)))
    elif family == "lis":
        cases = [([10, 9, 2, 5, 3, 7, 101, 18],), ([7, 7, 7],)]
        for _ in range(18):
            cases.append(([rng.randint(-30, 40) for _ in range(rng.randint(0, 45))],))
    elif family == "kth-largest":
        cases = [([3, 2, 1, 5, 6, 4], 2), ([3, 3, 3], 2)]
        for _ in range(18):
            nums = [rng.randint(-50, 60) for _ in range(rng.randint(1, 45))]
            cases.append((nums, rng.randint(1, len(nums))))
    elif family == "daily-temperatures":
        cases = [([73, 74, 75, 71, 69, 72, 76, 73],), ([30, 30, 30],)]
        for _ in range(18):
            cases.append(([rng.randint(20, 110) for _ in range(rng.randint(0, 60))],))
    elif family == "one-break-path":
        cases = [([[0, 1, 0], [0, 1, 0], [0, 0, 0]],), ([[0, 1], [1, 1]],)]
        for _ in range(16):
            r, c = rng.randint(2, 8), rng.randint(2, 8)
            grid = [[1 if rng.random() < 0.3 else 0 for _ in range(c)] for _ in range(r)]
            grid[0][0] = 0
            grid[-1][-1] = 0
            cases.append((grid,))
    elif family == "pair-distance":
        cases = [([1, 3, 1], 1), ([1, 6, 1], 3)]
        for _ in range(18):
            n = rng.randint(2, 22)
            nums = [rng.randint(0, 120) for _ in range(n)]
            cases.append((nums, rng.randint(1, n * (n - 1) // 2)))
    elif family == "weighted-schedule":
        cases = [([[1, 3, 5], [2, 5, 6], [4, 6, 5], [6, 7, 4]],), ([[1, 2, 4], [2, 3, 5]],)]
        for _ in range(18):
            jobs = []
            for _ in range(rng.randint(2, 24)):
                s = rng.randint(0, 60)
                jobs.append([s, s + rng.randint(1, 14), rng.randint(1, 50)])
            cases.append((jobs,))
    elif family == "mountain-removals":
        cases = [([2, 1, 1, 5, 6, 2, 3, 1],), ([1, 3, 1],)]
        for _ in range(16):
            cases.append(([rng.randint(0, 35) for _ in range(rng.randint(3, 18))],))
    elif family == "edit-distance":
        cases = [("horse", "ros"), ("", "abc")]
        alphabet = "abcd"
        for _ in range(18):
            a = "".join(rng.choice(alphabet) for _ in range(rng.randint(0, 12)))
            b = "".join(rng.choice(alphabet) for _ in range(rng.randint(0, 12)))
            cases.append((a, b))
    elif family == "minimum-window":
        cases = [("ADOBECODEBANC", "ABC"), ("a", "aa")]
        alphabet = "abcde"
        for _ in range(18):
            s = "".join(rng.choice(alphabet) for _ in range(rng.randint(0, 28)))
            t = "".join(rng.choice(alphabet) for _ in range(rng.randint(0, 6)))
            cases.append((s, t))
    elif family == "increasing-path":
        cases = [([[9, 9, 4], [6, 6, 8], [2, 1, 1]],), ([[1]],)]
        for _ in range(16):
            r, c = rng.randint(1, 6), rng.randint(1, 6)
            cases.append(([[rng.randint(0, 40) for _ in range(c)] for _ in range(r)],))
    elif family == "circular-subarray":
        cases = [([1, -2, 3, -2],), ([5, -3, 5],)]
        for _ in range(18):
            cases.append(([rng.randint(-20, 25) for _ in range(rng.randint(1, 35))],))
    elif family == "minimum-effort":
        cases = [([[1, 2, 2], [3, 8, 2], [5, 3, 5]],), ([[1]],)]
        for _ in range(16):
            r, c = rng.randint(1, 7), rng.randint(1, 7)
            cases.append(([[rng.randint(0, 50) for _ in range(c)] for _ in range(r)],))
    elif family == "pal-subsequence":
        cases = [("bbbab",), ("cbbd",)]
        alphabet = "abcde"
        for _ in range(18):
            cases.append(("".join(rng.choice(alphabet) for _ in range(rng.randint(0, 18))),))
    elif family == "distinct-subseq":
        cases = [("rabbbit", "rabbit"), ("babgbag", "bag")]
        alphabet = "abc"
        for _ in range(18):
            s = "".join(rng.choice(alphabet) for _ in range(rng.randint(0, 16)))
            t = "".join(rng.choice(alphabet) for _ in range(rng.randint(0, 7)))
            cases.append((s, t))
    elif family == "palindrome-cuts":
        cases = [("aab",), ("a",)]
        alphabet = "abcd"
        for _ in range(18):
            cases.append(("".join(rng.choice(alphabet) for _ in range(rng.randint(0, 13))),))
    else:
        raise KeyError(problem_id)
    return [list(x) for x in cases]


def self_test():
    assert len(FAMILIES) == 24
    assert len(PROBLEM_SPECS) == 120
    assert len(PROBLEM_BY_ID) == 120
    assert all(sum(1 for p in PROBLEM_SPECS if p["family"] == f["key"]) == 5 for f in FAMILIES)
    for spec in PROBLEM_SPECS:
        cases = generated_cases(spec["id"], 1234567)
        assert len(cases) >= 16, spec["id"]
        for args in cases:
            spec["reference"](*args)
    for seed in range(50):
        chosen = select_challenge(random.Random(seed))
        assert len(chosen) == 5
        assert len({p["family"] for p in chosen}) == 5
        assert sum(p["difficulty"] == "Medium" for p in chosen) == 3
        assert sum(p["difficulty"] == "Hard" for p in chosen) == 2
    return True


if __name__ == "__main__":
    self_test()
    print("problem bank self-test PASS: 120 problems, 24 families, balanced selection")
