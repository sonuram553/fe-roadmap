// You are given an array of integers nums, and an integer K.
// You need to find the maximum value in each sliding window of size K.
// let nums = [1, 3, -1, -3, 5, 3, 6, 7];
// let k = 3;
//output =[3,3,5,5,6,7]

let max = arr[0]
const result = [max]

let i = 1
while (i < k) {
  max = Math.max(max, arr[i])
  i += 1
}


l = 0
r = k - 1

while (r < arr.length) {
  if (arr[r + 1] > max) {
    max = arr[r + 1];
  }
  result.push(max)
  r += 1;
  l += 1;
}

console.log(result)