const p = (id, title, difficulty, functionName, prompt, starter, examples, tests) => Object.freeze({
  id, title, difficulty, functionName, prompt, starter, examples, tests
});

export const PROBLEMS = Object.freeze([
  p("two-sum", "Two Sum", "Easy", "two_sum",
    "Return indices [i, j] of two distinct numbers whose sum equals target. Exactly one answer exists and i < j.",
    "def two_sum(nums, target):\n    # return [i, j]\n    pass\n",
    [{ args: [[2,7,11,15], 9], expected: [0,1] }, { args: [[3,2,4], 6], expected: [1,2] }],
    [{ args: [[3,3], 6], expected: [0,1] }, { args: [[-5,8,2,9], 4], expected: [0,3] }]),

  p("valid-parentheses", "Valid Parentheses", "Easy", "valid_parentheses",
    "Return True when (), [], and {} are correctly balanced and nested.",
    "def valid_parentheses(s):\n    pass\n",
    [{ args: ["()[]{}"], expected: true }, { args: ["([{}])"], expected: true }],
    [{ args: ["(]"], expected: false }, { args: ["([)]"], expected: false }, { args: [""], expected: true }]),

  p("max-subarray", "Maximum Subarray", "Medium", "max_subarray",
    "Return the largest possible sum of a non-empty contiguous subarray.",
    "def max_subarray(nums):\n    pass\n",
    [{ args: [[-2,1,-3,4,-1,2,1,-5,4]], expected: 6 }, { args: [[1]], expected: 1 }],
    [{ args: [[5,4,-1,7,8]], expected: 23 }, { args: [[-8,-3,-6,-2,-5,-4]], expected: -2 }]),

  p("binary-search", "Binary Search", "Easy", "binary_search",
    "Given a sorted ascending list, return the index of target or -1.",
    "def binary_search(nums, target):\n    pass\n",
    [{ args: [[-1,0,3,5,9,12], 9], expected: 4 }, { args: [[-1,0,3,5,9,12], 2], expected: -1 }],
    [{ args: [[], 3], expected: -1 }, { args: [[2,5], 2], expected: 0 }]),

  p("merge-intervals", "Merge Intervals", "Medium", "merge_intervals",
    "Merge all overlapping closed intervals and return them sorted by start.",
    "def merge_intervals(intervals):\n    pass\n",
    [{ args: [[[1,3],[2,6],[8,10],[15,18]]], expected: [[1,6],[8,10],[15,18]] }, { args: [[[1,4],[4,5]]], expected: [[1,5]] }],
    [{ args: [[]], expected: [] }, { args: [[[1,4],[0,2],[3,5]]], expected: [[0,5]] }]),

  p("product-except-self", "Product Except Self", "Medium", "product_except_self",
    "Return an array where output[i] is the product of every input value except nums[i]. Do not use division.",
    "def product_except_self(nums):\n    pass\n",
    [{ args: [[1,2,3,4]], expected: [24,12,8,6] }, { args: [[-1,1,0,-3,3]], expected: [0,0,9,0,0] }],
    [{ args: [[2,3]], expected: [3,2] }, { args: [[0,4,0]], expected: [0,0,0] }]),

  p("longest-substring", "Longest Unique Substring", "Medium", "longest_unique_substring",
    "Return the length of the longest substring containing no repeated characters.",
    "def longest_unique_substring(s):\n    pass\n",
    [{ args: ["abcabcbb"], expected: 3 }, { args: ["bbbbb"], expected: 1 }],
    [{ args: ["pwwkew"], expected: 3 }, { args: [""], expected: 0 }, { args: ["dvdf"], expected: 3 }]),

  p("meeting-rooms", "Meeting Rooms", "Medium", "minimum_rooms",
    "Intervals are half-open [start, end). Return the minimum number of rooms required.",
    "def minimum_rooms(intervals):\n    pass\n",
    [{ args: [[[0,30],[5,10],[15,20]]], expected: 2 }, { args: [[[7,10],[2,4]]], expected: 1 }],
    [{ args: [[[1,2],[2,3],[2,4]]], expected: 2 }, { args: [[]], expected: 0 }]),

  p("coin-change", "Coin Change", "Medium", "coin_change",
    "Return the minimum number of coins needed to make amount, or -1 when impossible. Coins may be reused.",
    "def coin_change(coins, amount):\n    pass\n",
    [{ args: [[1,2,5], 11], expected: 3 }, { args: [[2], 3], expected: -1 }],
    [{ args: [[1], 0], expected: 0 }, { args: [[2,5,10,1], 27], expected: 4 }]),

  p("house-robber", "House Robber", "Medium", "house_robber",
    "Return the maximum sum obtainable without taking adjacent values.",
    "def house_robber(nums):\n    pass\n",
    [{ args: [[1,2,3,1]], expected: 4 }, { args: [[2,7,9,3,1]], expected: 12 }],
    [{ args: [[]], expected: 0 }, { args: [[2,1,1,2]], expected: 4 }]),

  p("number-of-islands", "Number of Islands", "Medium", "number_of_islands",
    "A grid contains strings '1' (land) and '0' (water). Count 4-directionally connected islands.",
    "def number_of_islands(grid):\n    pass\n",
    [{ args: [["11110","11010","11000","00000"]], expected: 1 }, { args: [["11000","11000","00100","00011"]], expected: 3 }],
    [{ args: [[]], expected: 0 }, { args: [["101","010","101"]], expected: 5 }]),

  p("shortest-binary-path", "Shortest Binary Matrix Path", "Medium", "shortest_binary_path",
    "In a square 0/1 grid, move in 8 directions through zeros. Return shortest path length from top-left to bottom-right, or -1.",
    "def shortest_binary_path(grid):\n    pass\n",
    [{ args: [[[0,1],[1,0]]], expected: 2 }, { args: [[[0,0,0],[1,1,0],[1,1,0]]], expected: 4 }],
    [{ args: [[[1,0],[0,0]]], expected: -1 }, { args: [[[0]]], expected: 1 }]),

  p("rotate-array", "Rotate Array", "Medium", "rotate_array",
    "Return a new list rotated right by k positions. The input may be empty.",
    "def rotate_array(nums, k):\n    pass\n",
    [{ args: [[1,2,3,4,5,6,7], 3], expected: [5,6,7,1,2,3,4] }, { args: [[-1,-100,3,99], 2], expected: [3,99,-1,-100] }],
    [{ args: [[], 5], expected: [] }, { args: [[1,2], 5], expected: [2,1] }]),

  p("kth-largest", "Kth Largest", "Medium", "kth_largest",
    "Return the kth largest value in nums where k is 1-indexed.",
    "def kth_largest(nums, k):\n    pass\n",
    [{ args: [[3,2,1,5,6,4], 2], expected: 5 }, { args: [[3,2,3,1,2,4,5,5,6], 4], expected: 4 }],
    [{ args: [[1], 1], expected: 1 }, { args: [[7,7,6,5], 3], expected: 6 }]),

  p("lis", "Longest Increasing Subsequence", "Medium", "lis_length",
    "Return the length of the longest strictly increasing subsequence.",
    "def lis_length(nums):\n    pass\n",
    [{ args: [[10,9,2,5,3,7,101,18]], expected: 4 }, { args: [[0,1,0,3,2,3]], expected: 4 }],
    [{ args: [[7,7,7,7]], expected: 1 }, { args: [[]], expected: 0 }]),

  p("word-break", "Word Break", "Medium", "word_break",
    "Return True if s can be segmented into one or more dictionary words. Dictionary words may be reused.",
    "def word_break(s, words):\n    pass\n",
    [{ args: ["leetcode", ["leet","code"]], expected: true }, { args: ["applepenapple", ["apple","pen"]], expected: true }],
    [{ args: ["catsandog", ["cats","dog","sand","and","cat"]], expected: false }, { args: ["", ["a"]], expected: true }]),

  p("daily-temperatures", "Daily Temperatures", "Medium", "daily_temperatures",
    "For each temperature, return how many days until a warmer temperature, or 0 if none.",
    "def daily_temperatures(temperatures):\n    pass\n",
    [{ args: [[73,74,75,71,69,72,76,73]], expected: [1,1,4,2,1,1,0,0] }, { args: [[30,40,50,60]], expected: [1,1,1,0] }],
    [{ args: [[30,60,90]], expected: [1,1,0] }, { args: [[90,80,70]], expected: [0,0,0] }]),

  p("min-window", "Minimum Window Substring", "Hard", "minimum_window",
    "Return the shortest substring of s containing every character of t with multiplicity. Return '' if impossible.",
    "def minimum_window(s, t):\n    pass\n",
    [{ args: ["ADOBECODEBANC", "ABC"], expected: "BANC" }, { args: ["a", "a"], expected: "a" }],
    [{ args: ["a", "aa"], expected: "" }, { args: ["aa", "aa"], expected: "aa" }]),

  p("course-schedule", "Course Schedule", "Medium", "can_finish",
    "Given num_courses and prerequisite pairs [course, prerequisite], return True if every course can be finished.",
    "def can_finish(num_courses, prerequisites):\n    pass\n",
    [{ args: [2, [[1,0]]], expected: true }, { args: [2, [[1,0],[0,1]]], expected: false }],
    [{ args: [4, [[1,0],[2,1],[3,2]]], expected: true }, { args: [3, [[0,1],[1,2],[2,0]]], expected: false }]),

  p("network-delay", "Network Delay", "Medium", "network_delay",
    "Directed weighted edges are [u,v,w], nodes are 1..n. Return time for a signal from k to reach all nodes, or -1.",
    "def network_delay(times, n, k):\n    pass\n",
    [{ args: [[[2,1,1],[2,3,1],[3,4,1]], 4, 2], expected: 2 }, { args: [[[1,2,1]], 2, 1], expected: 1 }],
    [{ args: [[[1,2,1]], 2, 2], expected: -1 }, { args: [[[1,2,5],[1,3,2],[3,2,1]], 3, 1], expected: 3 }])
]);

export const PROBLEM_BY_ID = new Map(PROBLEMS.map((problem) => [problem.id, problem]));
