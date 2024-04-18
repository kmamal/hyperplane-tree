const { memoize } = require('@kmamal/util/function/memoize')
const { chooseN } = require('@kmamal/util/random/choose-n')
const { __partitionByHoare } = require('@kmamal/util/array/sorting/quicksort/partition-by-hoare')
const { __insertionsort } = require('@kmamal/util/array/sorting/insertionsort')

const defineFor = memoize((V) => {
	const M = V.Domain
	const _ZERO = M.fromNumber(0)
	const _HALF = M.fromNumber(1 / 2)

	const fnDist = (a, b) => V.norm(V.sub(a, b))

	const cmpByDist = (a, b) => a.dist - b.dist

	const _middleHyperplane = (s, t) => {
		const st = V.sub(t, s)
		const scale = M.inverse(V.norm(st))
		return {
			a: V.scale.$$$(st, scale),
			b: M.mul(
				M.sub(V.normSquared(t), V.normSquared(s)),
				M.mul(scale, _HALF),
			),
		}
	}

	const _cmpWithHyperplane = (a, b, p) => M.sub(V.dot(a, p), b)

	const _distanceToHyperplane = (a, b, p) => M.abs(M.sub(V.dot(a, p), b))

	const _makeNode = (a, b, size) => ({
		a,
		b,
		size,
		left: null,
		right: null,
	})

	class HyperplaneTree {
		constructor (maxBinSize) {
			this._maxBinSize = maxBinSize
			this._root = null
		}

		insert (point) {
			let prev = null
			let side
			let node = this._root

			for (;;) {
				if (node === null) {
					const bin = [ point ]
					if (prev !== null) {
						prev[side] = bin
					} else {
						this._root = bin
					}
					return
				}

				if (Array.isArray(node)) {
					if (node.length < this._maxBinSize) {
						node.push(point)
						return
					}

					const bin = node
					let index
					do {
						const [ s, t ] = chooseN(bin, 2)
						const { a, b } = _middleHyperplane(s, t)
						node = _makeNode(a, b, bin.length + 1)

						index = __partitionByHoare(
							bin, 0, bin.length, null, (p, _) => _cmpWithHyperplane(a, b, p),
						)
					} while (Math.abs(index - bin.length / 2) > bin.length / 4)
					node.left = bin.slice(0, index)
					node.right = bin.slice(index)

					if (prev !== null) {
						prev[side] = node
					} else {
						this._root = node
					}
				}

				const { a, b } = node
				side = M.lt(_cmpWithHyperplane(a, b, point), _ZERO) ? 'left' : 'right'
				const next = node[side]

				if (next === null) {
					node[side] = [ point ]
					return
				}

				prev = node
				node = next
			}
		}

		nearestNeighbor (target) {
			const solution = { point: null, dist: Infinity }

			const _nearestNeighbor = (node) => {
				if (Array.isArray(node)) {
					for (const point of node) {
						const dist = fnDist(point, target)
						if (dist < solution.dist) {
							solution.point = point
							solution.dist = dist
						}
					}
					return
				}

				const { a, b, left, right } = node
				let first
				let second
				if (M.lt(_cmpWithHyperplane(a, b, target), _ZERO)) {
					first = left
					second = right
				} else {
					first = right
					second = left
				}

				_nearestNeighbor(first)

				const dist = _distanceToHyperplane(a, b, target)
				if (dist > solution.dist) { return }

				_nearestNeighbor(second)
			}

			const node = this._root
			if (node) { _nearestNeighbor(node) }

			return solution
		}

		kNearestNeighbors (target, k) {
			const solutions = []

			const _nearestNeighbor = (node) => {
				if (Array.isArray(node)) {
					for (const point of node) {
						const dist = fnDist(point, target)
						const { length } = solutions
						if (length < k) {
							solutions.push({ point, dist })
							__insertionsort(solutions, 0, length - 1, length, cmpByDist)
						} else {
							const lastIndex = length - 1
							const last = solutions[lastIndex]
							if (dist < last.dist) {
								last.point = point
								last.dist = dist
								__insertionsort(solutions, 0, lastIndex, length, cmpByDist)
							}
						}
					}
					return
				}

				const { a, b, left, right } = node
				let first
				let second
				if (M.lt(_cmpWithHyperplane(a, b, target), _ZERO)) {
					first = left
					second = right
				} else {
					first = right
					second = left
				}

				_nearestNeighbor(first)

				const dist = _distanceToHyperplane(a, b, target)
				if (solutions.length > 0 && dist > solutions.at(-1).dist) { return }

				_nearestNeighbor(second)
			}

			const node = this._root
			if (node) { _nearestNeighbor(node) }

			return solutions
		}
	}

	return { HyperplaneTree }
})

module.exports = { defineFor }
