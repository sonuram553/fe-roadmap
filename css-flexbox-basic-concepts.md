# Basic Concepts of Flexbox

The flexible box layout module (usually referred to as flexbox) is a one-dimensional layout model for distributing space between items and includes numerous alignment capabilities.

When we describe flexbox as being one-dimensional we are describing the fact that flexbox deals with layout in one dimension at a time — either as a row or as a column. This can be contrasted with the two-dimensional model of CSS Grid Layout, which controls columns and rows together.

## Table of Contents

- [The two axes of flexbox](#the-two-axes-of-flexbox)
- [Start and end lines](#start-and-end-lines)
- [The flex container](#the-flex-container)
- [Multi-line flex containers with flex-wrap](#multi-line-flex-containers-with-flex-wrap)
- [The flex-flow shorthand](#the-flex-flow-shorthand)
- [Properties applied to flex items](#properties-applied-to-flex-items)
- [Alignment, justification and distribution of free space between items](#alignment-justification-and-distribution-of-free-space-between-items)

## The two axes of flexbox

When working with flexbox you need to think in terms of two axes — the **main axis** and the **cross axis**. The main axis is defined by the flex-direction property, and the cross axis runs perpendicular to it. Everything we do with flexbox refers back to these axes, so it is worth understanding how they work from the outset.

### The main axis

The main axis is defined by `flex-direction`, which has four possible values:

- `row`
- `row-reverse`
- `column`
- `column-reverse`

Should you choose `row` or `row-reverse`, your main axis will run along the row in the **inline direction**.

If flex-direction is set to row the main axis runs along the row in the inline direction.

Choose `column` or `column-reverse` and your main axis will run in the **block direction**, from the top of the page to the bottom.

If flex-direction is set to column the main axis runs in the block direction.

### The cross axis

The cross axis runs perpendicular to the main axis. Therefore, if your `flex-direction` (main axis) is set to `row` or `row-reverse` the cross axis runs down the columns.

If flex-direction is set to row then the cross axis runs in the block direction.

If your main axis is `column` or `column-reverse` then the cross axis runs along the rows.

If flex-direction is set to column then the cross axis runs in the inline direction.

## Start and end lines

Another vital area of understanding is how flexbox makes no assumption about the writing mode of the document. Flexbox doesn't just assume that all lines of text start at the top left of a document and run towards the right-hand side, with new lines appearing one under the other. Rather, it supports all writing modes, like other logical properties and values.

You can read more about the relationship between flexbox and writing modes in a later article; however, the following description should help explain why we do not talk about left and right and top and bottom when we describe the direction that our flex items flow in.

### Writing Mode Impact on Main Axis

**Yes, the start and end lines for the main axis in flexbox layout absolutely depend on the writing mode.**

#### Horizontal Writing Modes

**English (LTR - Left-to-Right):**

- `flex-direction: row` → Main axis starts on the **left**, ends on the **right**
- `flex-direction: row-reverse` → Main axis starts on the **right**, ends on the **left**

**Arabic (RTL - Right-to-Left):**

- `flex-direction: row` → Main axis starts on the **right**, ends on the **left**
- `flex-direction: row-reverse` → Main axis starts on the **left**, ends on the **right**

#### Vertical Writing Modes

**Japanese/Chinese (Vertical):**

- `flex-direction: row` → Main axis starts at the **top**, ends at the **bottom**
- `flex-direction: column` → Main axis starts at the **right**, ends at the **left** (in vertical-rl)

### Cross Axis Adaptation

The cross axis also adapts to writing mode:

- **Horizontal writing modes** (English, Arabic): Cross axis runs **top to bottom**
- **Vertical writing modes** (Chinese, Japanese): Cross axis runs **left to right** (or right to left in RTL vertical)

### Practical Implications

1. **justify-content values adapt automatically:**

   - `flex-start` and `flex-end` automatically adjust to the writing mode
   - No need to change CSS when switching between LTR and RTL

2. **Logical properties:**

   - Use "start" and "end" instead of "left" and "right"
   - This makes your layouts work across all writing modes

3. **Writing-mode agnostic:**
   - Flexbox works with any writing mode without additional CSS changes
   - The same flexbox code works for English, Arabic, Chinese, etc.

After a while, thinking about start and end rather than left and right becomes natural, and will be useful to you when dealing with other layout methods such as CSS Grid Layout which follow the same patterns.

## The flex container

An area of a document that is laid out using flexbox is called a **flex container**. To create a flex container, set the area's display property to `flex`. When we do this, the direct children of that container become **flex items**. You can explicitly control whether the container itself is displayed inline or in block formatting context using `inline flex` or `inline-flex` for inline flex containers or `block flex` or `flex` for block level flex containers.

### Initial values

As with all properties in CSS, some initial values are defined, so the contents of a new flex container will behave in the following way:

- Items display in a row (the flex-direction property's default value is `row`).
- The items start from the start edge of the main axis.
- The items do not stretch on the main dimension but can shrink (a flex-item's flex-grow property's default value is `0` and its flex-shrink property's default value is `1`).
- The items will stretch to fill the size of the cross-axis.
- The flex-basis property is set to `auto`.
- The flex-wrap property is set to `nowrap`.

This means that your flex items will be laid out in a row, using the size of the content as their size in the main axis. If there are more items than can fit in the container, they will not wrap but will instead overflow. If some items are taller than others, all items will stretch along the full length of the cross-axis.

## Multi-line flex containers with flex-wrap

While flexbox is a one dimensional model, it is possible to cause our flex items to wrap onto multiple lines. In doing so, you should consider each line as a new flex container. Any space distribution will happen across that line, without reference to the lines either side.

To cause wrapping behavior add the property `flex-wrap` with a value of `wrap`. Now, should your items be too large to all display in one line, they will wrap onto another line. The live sample below contains items that have been given a width, the total width of the items being too wide for the flex container. As `flex-wrap` is set to `wrap`, the items wrap. Set it to `nowrap`, which is also the initial value, and they will instead shrink to fit the container because they are using initial flexbox values that allows items to shrink. Using `nowrap` would cause an overflow if the items were not able to shrink, or could not shrink small enough to fit.

## The flex-flow shorthand

You can combine the `flex-direction` and `flex-wrap` properties into the `flex-flow` shorthand. The first value specified is `flex-direction` and the second value is `flex-wrap`.

## Properties applied to flex items

To have more control over flex items we can target them directly. We do this by way of three properties:

- `flex-grow`
- `flex-shrink`
- `flex-basis`

We will take a brief look at these properties in this overview, and you can gain a fuller understanding in the guide [Controlling Ratios of Flex Items on the Main Axis](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Controlling_ratios_of_flex_items_along_the_main_axis).

Before we can make sense of these properties we need to consider the concept of **available space**. What we are doing when we change the value of these flex properties is to change the way that available space is distributed amongst our items. This concept of available space is also important when we come to look at aligning items.

If we have three 100 pixel-wide items in a container which is 500 pixels wide, then the space we need to lay out our items is 300 pixels. This leaves 200 pixels of available space. If we don't change the initial values then flexbox will put that space after the last item.

If we instead would like the items to grow and fill the space, then we need to have a method of distributing the leftover space between the items. This is what the `flex` properties do when applied to flex items.

### The flex-basis property

The `flex-basis` is what defines the size of that item in terms of the space it leaves as available space. The initial value of this property is `auto` — in this case the browser looks to see if the items have a size. In the example above, all of the items have a width of 100 pixels and so this is used as the `flex-basis`.

If the items don't have a size then the content size is used as the `flex-basis`. This is why when we just declare `display: flex` on the parent to create flex items, the items all move into a row and take only as much space as they need to display their contents.

### The flex-grow property

With the `flex-grow` property set to a positive integer, flex items can grow along the main axis from their `flex-basis`. This will cause the item to stretch and take up any available space on that axis, or a proportion of the available space if other items are allowed to grow too.

If we gave all of our items in the example above `flex-grow` value of 1 then the available space in the flex container would be equally shared between our items and they would stretch to fill the container on the main axis.

The `flex-grow` property can be used to distribute space in proportion. If we gave the first item `flex-grow` value of 2, and the other items a value of 1 each, 2 parts of the available space will be given to the first item (100px out of 200px in the case of the example above), 1 part each the other two items (50px each out of the 200px total).

### The flex-shrink property

Where the `flex-grow` property deals with adding space in the main axis, the `flex-shrink` property controls how it is taken away. If we do not have enough space in the container to lay out our items, and `flex-shrink` is set to a positive integer, then the item can become smaller than the `flex-basis`. As with `flex-grow`, different values can be assigned in order to cause one item to shrink faster than others — an item with a higher value for `flex-shrink` will shrink faster than its siblings that have lower values.

The minimum size of the item will be taken into account while working out the actual amount of shrinkage that will happen, which means that `flex-shrink` has the potential to appear less consistent than `flex-grow` in behavior. We'll therefore take a more detailed look at how this algorithm works in the article [Controlling Ratios of Flex Items on the Main Axis](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Controlling_ratios_of_flex_items_along_the_main_axis).

### The flex shorthand

You will very rarely see the `flex-grow`, `flex-shrink` and `flex-basis` properties used individually; instead they are combined into the `flex` shorthand. The `flex` shorthand allows you to set the three values in this order — `flex-grow`, `flex-shrink`, `flex-basis`.

The live example below allows you to test out the different values of the flex shorthand; remember that the first value is `flex-grow` and that this is what allows the items to grow. The second value is `flex-shrink` and the third is `flex-basis`.

## Alignment, justification and distribution of free space between items

A key feature of flexbox is the ability to align and justify items on the main- and cross-axes, and to distribute space between flex items. Note that these properties are to be set on the flex container, not on the items themselves.

### align-items

The `align-items` property will align the items on the cross axis.

The initial value for this property is `stretch`, which is why flex items stretch to the height of the flex container by default. This might be the height of the flex container, or the height of the tallest item if the flex container has no height set.

You could instead set `align-items` to `flex-start` in order to make the items align to the start of the flex container, `flex-end` to align them to the end, or `center` to align them in the center. See the live example below for a full list of the possible values for `align-items`.

### justify-content

The `justify-content` property is used to align the items on the main axis, the direction in which `flex-direction` has set the flow. The initial value is `flex-start` which will line the items up at the start edge of the container, but you could set the value to `flex-end` to line them up at the end, or `center` to line them up in the center.

You can also use the value `space-between` to take all the spare space after the items have been laid out, and share it out evenly between the items so there will be an equal amount of space between each item. To cause an equal amount of space on the right and left of each item use `space-around`. With `space-around`, items have a half-size space on either end. Or, to cause items to have equal space around them use `space-evenly`. With `space-evenly`, items have a full-size space on either end.

In the live example below try changing the `justify-content` property to see how it moves the items around.

_Source: [MDN Web Docs - Basic concepts of flexbox](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Basic_concepts_of_flexbox)_
