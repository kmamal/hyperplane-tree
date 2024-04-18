const Sdl = require('@kmamal/sdl')
const { KeyCommands } = require('@kmamal/key-commands')
const { createCanvas } = require('canvas')

const window = Sdl.video.createWindow()
const { pixelWidth: width, pixelHeight: height } = window
const canvas = createCanvas(width, height)
const ctx = canvas.getContext('2d')

const { rand } = require('@kmamal/util/random/rand')
const { throttle } = require('@kmamal/util/function/async/throttle')

const M = require('@kmamal/numbers/js')
const V = require('@kmamal/linear-algebra/vec2').defineFor(M)
const { HyperplaneTree } = require('../src/for-points').defineFor(V)

const N = 100
const K = 5

let points
let tree
let mouse = null

const reset = () => {
	tree = new HyperplaneTree(K)

	points = []
	for (let i = 0; i < N; i++) {
		const point = [
			rand(width),
			rand(height),
		]
		tree.insert(point)
		points.push(point)
	}

	render()
}

const render = throttle(() => {
	ctx.fillStyle = 'black'
	ctx.fillRect(0, 0, width, height)

	ctx.strokeStyle = 'white'
	ctx.lineWidth = 1

	const drawNode = (node) => {
		if (node === null || Array.isArray(node)) { return }

		const { a: [ ax, ay ], b, left, right } = node

		const drawLine = () => {
			if (ax < ay) {
				const y0 = b / ay
				const y1 = (b - ax * width) / ay
				if (ay > 0) {
					ctx.moveTo(width, y1)
					ctx.lineTo(0, y0)
				} else {
					ctx.moveTo(0, y0)
					ctx.lineTo(width, y1)
				}
			} else {
				const x0 = b / ax
				const x1 = (b - ay * height) / ax
				if (ax > 0) {
					ctx.moveTo(x0, 0)
					ctx.lineTo(x1, height)
				} else {
					ctx.moveTo(x1, height)
					ctx.lineTo(x0, 0)
				}
			}
		}

		const periphery = [
			[ width, 0 ], //
			[ 0, 0 ],
			[ 0, height ],
			[ width, height ],
			[ width, 0 ],
			[ 0, 0 ], //
		]
		const drawPeriphery = (index, order = 1) => {
			ctx.lineTo(...periphery[index - order])
			ctx.lineTo(...periphery[index])
			ctx.lineTo(...periphery[index + order])
		}

		ctx.save()
		{
			ctx.beginPath()
			drawLine()
			if (ax < 0) {
				if (ay < 0) {
					drawPeriphery(3, -1)
				} else {
					drawPeriphery(4, -1)
				}
			} else if (ay > 0) {
				drawPeriphery(1, -1)
			} else {
				drawPeriphery(2, -1)
			}
			ctx.clip()

			ctx.fillStyle = 'rgba(255, 0, 0, 0.1)'
			ctx.fillRect(0, 0, width, height)

			drawNode(left)
		}
		ctx.restore()

		ctx.save()
		{
			ctx.beginPath()
			drawLine()
			if (ax < 0) {
				if (ay < 0) {
					drawPeriphery(1)
				} else {
					drawPeriphery(2)
				}
			} else if (ay > 0) {
				drawPeriphery(3)
			} else {
				drawPeriphery(4)
			}
			ctx.clip()

			ctx.fillStyle = 'rgba(0, 0, 255, 0.1)'
			ctx.fillRect(0, 0, width, height)

			drawNode(right)
		}
		ctx.restore()

		ctx.beginPath()
		drawLine()
		ctx.stroke()
	}

	drawNode(tree._root)

	if (mouse) {
		const nearest = tree.kNearestNeighbors(mouse, 5)

		ctx.strokeStyle = 'green'
		for (let i = 0; i < nearest.length; i++) {
			ctx.lineWidth = 5 - i
			ctx.beginPath()
			ctx.moveTo(...mouse)
			ctx.lineTo(...nearest[i].point)
			ctx.stroke()
		}

		ctx.fillStyle = 'white'
		ctx.fillRect(mouse[0] - 3, mouse[1] - 3, 6, 6)
	}

	ctx.fillStyle = 'red'
	for (const [ x, y ] of points) {
		ctx.fillRect(x - 3, y - 3, 6, 6)
	}

	const buffer = canvas.toBuffer('raw')
	window.render(width, height, width * 4, 'bgra32', buffer)
}, 0)

window.on('expose', render)

window.on('mouseMove', ({ x, y }) => {
	mouse = [ x, y ]
	render()
})
window.on('leave', () => {
	mouse = null
	render()
})

reset()

new KeyCommands({
	global: [
		{
			shortcut: 'space',
			description: "Reset",
			command: reset,
		},
	],
}).attach(window).printHelp()
