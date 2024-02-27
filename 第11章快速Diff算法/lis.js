/**
* @param {number[]} nums
* @return {number}
*/
// 时间复杂度 O(N^2) ： 双层遍历
// 空间复杂度 O(N) ： dp table需要的空间
// 递推公式： dp[i] = Math.max(dp[i], dp[j] + 1)  （j < i && nums[i] > nums[j]）【以nums[i]结尾的系列的最长递增子系列的长度】
// 由上面公式推导出：dp[i] = Math.max(dp[0, ..., i-1]) + 1  【nums从0到i-1结尾的系列的最长升序子序列长度 + 1 的最大值】

var lengthOfLIS = function (nums) {
    var len = nums.length
    if (len == 0) {
        return 0;
    }

    var dp = Array(len).fill(1)
    var max = 1
    // dp[i]: 以i结尾的最长递增子系列
    for (var i = 1;i < len;i++) {
        // 遍历i之前的元素，找到可以添加到以i结尾子系列中
        for (var j = i - 1;j >= 0;j--) {
            if (nums[i] > nums[j]) {
                dp[i] = Math.max(dp[i], dp[j] + 1)
            }
        }
        max = Math.max(max, dp[i])
    }

    return max
};
// 时间复杂度 O(NlogN) ： 遍历 nums 列表需 O(N)，在每个 nums[i]二分法需 O(logN)。
// 空间复杂度 O(N) ： tails 列表占用线性大小额外空间
// tails[k] 的值代表当前(长度为 k+1)子序列的尾部元素值

// 贪心法保证子系列增长最慢，由于已排列的的系列是单调递增，所以查找当前元素插入位置可以使用二分法，效率更高

var lengthOfLIS = function (nums) {
    // 当前子系列的递增子系列数组
    const tails = Array(nums.length)
    let res = 0;

    for (let i = 0;i < nums.length;i++) {
        // tails初始为空，可以直接加入
        // 如果nums[i]比tails最后一个都大，直接往tails后添加nums[i]；
        if (res === 0 || nums[i] > tails[res - 1]) {
            tails[res++] = nums[i]
        } else {
            // 否则通过二分查找找出tails里第一个大于nums[i]的位置，并用nums[i]替换掉原来的值
            // 二分插入法： 二分法遍历tails, 找到nums[i]在tails中位置
            let l = 0, r = res;
            while (l < r) {
                let mid = (l + r) >> 1
                if (tails[mid] < nums[i]) {
                    l = mid + 1
                } else {
                    r = mid
                }
            }
            // 用nums[i]替换掉原来的值
            tails[l] = nums[i]
        }
    }
    return res
}
