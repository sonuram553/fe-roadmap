# Buffers and typed arrays

This is a side note to [lesson 7](07-transferring-instead-of-copying.md). In that lesson, Kabir moves a photo into a worker by transferring `pixels.buffer`. In §4, a mask he never sent goes along with it. Both are easier to follow once you can see how a typed array is connected to the buffer behind it. The output below is real, from Chrome 155.

## 1. The pan: `ArrayBuffer`

```js
const buffer = new ArrayBuffer(16);
console.log('byteLength', buffer.byteLength, '| buffer[0] =', buffer[0]);
```

```
byteLength 16 | buffer[0] = undefined
```

`new ArrayBuffer(16)` reserves 16 bytes of memory, all set to zero. That's all an `ArrayBuffer` is: a block of bytes.

You can't get at those bytes directly. `buffer[0]` is `undefined`, and there's no method for reading or writing a single byte.

Think of the pan from lesson 7 as a muffin pan with 16 cups. The `ArrayBuffer` is the pan. To put something into a cup, or see what's in one, you need a view.

There's also `SharedArrayBuffer`, a pan both threads hold at the same time, covered in [lesson 9](09-shared-memory-and-atomics.md). This note is about the ordinary kind, which has one owner at a time.

## 2. Views: frames laid over the cups

```js
const photo = new Uint8ClampedArray(buffer, 0, 8);
const mask  = new Uint8ClampedArray(buffer, 8, 8);
console.log('photo: starts at byte', photo.byteOffset, '| length', photo.length);
console.log('mask:  starts at byte', mask.byteOffset, '| length', mask.length);
console.log('same buffer?', photo.buffer === mask.buffer, photo.buffer === buffer);
```

```
photo: starts at byte 0 | length 8
mask:  starts at byte 8 | length 8
same buffer? true true
```

A typed array such as `Uint8ClampedArray` is a **view**. It has no bytes of its own. Picture a frame laid over some of the pan's cups: you reach into those cups through it. The three arguments say where the frame sits:

- `buffer` is the pan.
- The second argument is the **byte offset**, the cup where the frame starts.
- The third is the **length**, the number of elements the frame covers.

So Kabir's two frames split the pan in half:

```
byte:  0  1  2  3  4  5  6  7 | 8  9 10 11 12 13 14 15
       └─────── photo ───────┘ └──────── mask ───────┘
```

Both frames sit on the same pan. `photo.buffer` and `mask.buffer` aren't copies. Both are the `buffer` from §1.

A write through a view goes straight into the pan. A third view laid over all 16 cups shows both writes:

```js
const all = new Uint8Array(buffer);
photo[0] = 10;
mask[0] = 99;
console.log(all.join(' '));
```

```
10 0 0 0 0 0 0 0 99 0 0 0 0 0 0 0
```

Each view counts from its own start. `photo[0]` is cup 0 of the pan, but `mask[0]` is cup 8, because that's where the mask's frame begins.

A frame also has edges. The photo covers cups 0 to 7, so `photo[8]` is past its end, even though cup 8 exists in the pan:

```js
photo[8] = 7;
console.log('photo[8] =', photo[8], '| mask[0] =', mask[0], '| all:', all.join(' '));
```

```
photo[8] = undefined | mask[0] = 99 | all: 10 0 0 0 0 0 0 0 99 0 0 0 0 0 0 0
```

The write was dropped with no error. It didn't spill into the mask's half.

## 3. Why "Clamped"

`Uint8` means each element is one byte, a whole number from 0 to 255. `Clamped` decides what happens when you store something that doesn't fit:

```js
const clamped = new Uint8ClampedArray(4);
const wrapped = new Uint8Array(4);
for (const arr of [clamped, wrapped]) {
  arr[0] = 300; arr[1] = -5; arr[2] = 1.5; arr[3] = 2.5;
}
console.log('clamped:', clamped.join(' '));
console.log('wrapped:', wrapped.join(' '));
```

```
clamped: 255 0 2 2
wrapped: 44 251 1 2
```

- **Clamped.** Anything above 255 is stored as 255, and anything below 0 is stored as 0. Fractions are rounded to the nearest whole number. An exact half goes to the even number, so 1.5 and 2.5 both become 2.
- **Plain `Uint8Array`.** Values wrap around like a car's odometer. 300 is 44 past 256, so it's stored as 44. −5 counts back from 256 to 251. Fractions are simply cut off, so 1.5 becomes 1.

Pixels need clamping. If Kabir brightens a nearly white pixel by 50, it should stay white at 255. With wrapping, it would turn nearly black. The blur depends on clamping too. Its averages are often fractions, and in [step 7 of the blur walkthrough](box-blur.md#step-7-write-the-average) the array does the rounding.

Canvas pixel data comes as this type. It also shows where the 24 MB in [lesson 2](02-messages-are-copies.md) §4 comes from:

```js
const image = new ImageData(3000, 2000);
console.log(image.data.constructor.name, image.data.length);
```

```
Uint8ClampedArray 24000000
```

Each pixel takes four bytes (red, green, blue and alpha), so 3000 × 2000 × 4 = 24,000,000. Kabir's 16-byte pan is a small stand-in: its photo half holds two pixels.

## 4. Offsets are in bytes, lengths are in elements

When each element is one byte, "8 bytes" and "8 elements" mean the same thing, and that hides a difference. Other typed arrays have bigger elements. A `Float32Array` stores each decimal number in 4 bytes:

```js
const scratch = new ArrayBuffer(8);
const asFloats = new Float32Array(scratch);
const asBytes  = new Uint8Array(scratch);
asFloats[0] = 1;
console.log('as floats:', asFloats.length, 'elements | as bytes:', asBytes.length, 'elements');
console.log('the float 1, byte by byte:', asBytes.join(' '));
```

```
as floats: 2 elements | as bytes: 8 elements
the float 1, byte by byte: 0 0 128 63 0 0 0 0
```

The same 8 bytes are two floats through one view and eight bytes through the other. The bytes themselves don't record what they hold. The view decides how to read them. Writing the number 1 through the float view filled four cups with 0, 0, 128 and 63, which is how a 32-bit float stores 1.

That's why the two numbers you pass to the constructor use different units. The offset is counted in bytes, because it's a position in the pan, and the pan only knows about bytes. The length is counted in elements, because it says how many items the view holds. The offset also has to be a multiple of the element size, so that one float can't start partway through another. `new Float32Array(scratch, 3, 1)` throws `RangeError: start offset of Float32Array should be a multiple of 4`.

## 5. `subarray()` and `slice()`

A typed array has two ways to give you part of itself, and they look alike:

```js
const sub = all.subarray(0, 8);
const cut = all.slice(0, 8);
sub[5] = 55;
cut[6] = 66;
console.log('sub shares the buffer?', sub.buffer === buffer, '| cut shares it?', cut.buffer === buffer);
console.log('all[5] =', all[5], '| all[6] =', all[6], '| cut has its own', cut.buffer.byteLength, 'bytes');
```

```
sub shares the buffer? true | cut shares it? false
all[5] = 55 | all[6] = 0 | cut has its own 8 bytes
```

`subarray()` makes a new frame over the same pan. Writing 55 through it changed the pan, so `all` sees the change. `slice()` makes a new pan and copies the bytes into it. Writing 66 into the slice changed only the slice.

`subarray()` costs nothing, because no bytes are copied. `slice()` costs a copy, but the result belongs to you alone.

## 6. What a transfer takes

This explains lesson 7 §4. A transfer list takes buffers, not views. Here is Kabir's code again, with a value in each half and a worker that prints every byte it receives:

```js
// receive.js
self.onmessage = (event) => {
  const { pixels } = event.data;
  console.log('worker got', pixels.length, 'photo bytes; whole buffer:', new Uint8Array(pixels.buffer).join(' '));
};
```

```js
const worker = new Worker('receive.js');
const buffer = new ArrayBuffer(16);
const photo = new Uint8ClampedArray(buffer, 0, 8);
const mask  = new Uint8ClampedArray(buffer, 8, 8);
photo[0] = 10;
mask[0] = 99;

worker.postMessage({ pixels: photo }, [photo.buffer]);
console.log('photo.length', photo.length, '| mask.length', mask.length, '| buffer.detached', buffer.detached);
```

```
photo.length 0 | mask.length 0 | buffer.detached true
worker got 8 photo bytes; whole buffer: 10 0 0 0 0 0 0 0 99 0 0 0 0 0 0 0
```

1. **`photo.buffer` is the whole pan.** A view has no buffer of its own, so asking for the photo's buffer gives you all 16 bytes, including the mask's half.
2. **The pan leaves, and every frame on it goes dead.** `photo` and `mask` both drop to length 0, even though the mask was never in the message. As lesson 7 §3 showed, writes to either one are now silently ignored.
3. **The worker gets the photo, and the mask comes along unseen.** The worker's `pixels` is a new view with the same start and length as `photo`: 8 bytes from byte 0. Its buffer, though, is the whole pan. The 99 in cup 8 is the mask Kabir meant to keep. The worker could read it with `new Uint8ClampedArray(pixels.buffer, 8, 8)`.

The fix is `slice()` from §5: copy the photo into a pan of its own, and transfer that. Here it is again, starting from a fresh buffer set up the same way:

```js
const photoOnly = photo.slice();
worker.postMessage({ pixels: photoOnly }, [photoOnly.buffer]);
console.log('photo.length', photo.length, '| mask.length', mask.length, '| mask[0] =', mask[0]);
```

```
photo.length 8 | mask.length 8 | mask[0] = 99
worker got 8 photo bytes; whole buffer: 10 0 0 0 0 0 0 0
```

This time only the 8-byte copy travelled. The page still has both halves of its pan, and the worker saw only the photo. The copy takes some time, as §5 said, but only for the part Kabir actually sends.
