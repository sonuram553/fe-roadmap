function Calculator(num) {
  this.num = num;
}

Calculator.prototype.add = function (n) {
  this.num += n;
  return this;
};

Calculator.prototype.subtract = function (n) {
  this.num -= n;
  return this;
};

Calculator.prototype.display = function () {
  console.log(this.num);
  return this;
};

new Calculator(10)
  .add(1)
  .add(2)
  .subtract(3)
  .add(1)
  .subtract(2)
  .display()
  .display()
  .add(10)
  .display()
  .subtract(9)
  .display()
  .display();

new Calculator(10).add(1).subtract(2).display();
