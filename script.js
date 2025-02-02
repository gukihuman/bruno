/*
  part - particle
  px - pixel
  sq - squared
  img - image
  el - element
*/
const PART_SIZE = 5
const EDGE = PART_SIZE * 10
const WIDTH = 420 + EDGE * 2
const HEIGHT = 660 + EDGE * 2
const SWITCH_THRESHOLD = 0.8
const SWITCH_TIME = 2000
const PIXEL_DISTANCE = 8
const FORCE_MULTIPLIER = 0.7
const FRICTION = 0.9
const RADIUS = 50
const RADIUS_GROWTH = 5
const RADIUS_GROWTH_2 = 15
const RADIUS_DECAY = 2
const EFFECT_TYPES = {
    SAND: 0,
    CHANGE: 1,
}
window.addEventListener("load", function () {
    const effect = new Effect()
    // const monitor = new PerformanceMonitor(60)
    function animate() {
        // monitor.start()
        effect.update()
        // monitor.end()
        requestAnimationFrame(animate)
    }
    animate()
})
class PerformanceMonitor {
    constructor(interval) {
        this.frameTimes = []
        this.frameCount = 0
        this.interval = interval
        this.startTime = 0
    }
    start() {
        this.startTime = performance.now()
    }
    end() {
        const endTime = performance.now()
        const frameTime = endTime - this.startTime
        this.frameTimes.push(frameTime)
        this.frameCount++
        if (this.frameCount >= this.interval) {
            const averageFrameTime =
                this.frameTimes.reduce((sum, time) => sum + time, 0) /
                this.frameTimes.length
            console.log(`Average frame time: ${averageFrameTime.toFixed(2)}ms`)
            this.frameTimes = []
            this.frameCount = 0
        }
    }
}
class Effect {
    constructor() {
        this.type = EFFECT_TYPES.SAND
        this.imgs = document.getElementsByTagName("img")
        this.nextImgI = 1
        this.lastSwitchTime = -Infinity
        this.canvas = document.getElementsByTagName("canvas")[0]
        this.progressBarEl = document.getElementById("progressBar")
        this.progressEl = document.getElementById("progress")
        this.percentageEl = document.getElementById("percentage")
        this.canvas.width = WIDTH
        this.canvas.height = HEIGHT
        this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })
        this.partSets = []
        this.parts = []
        this.mouse = {
            maxRadiusSq: RADIUS ** 2,
            radiusSq: 1,
            radiusGrowth: RADIUS_GROWTH,
            x: undefined,
            y: undefined,
        }
        this.firstMoveDispatched = false
        this._initParts()
        this._setupEventListeners()
    }
    _initParts() {
        for (let i = 0; i < this.imgs.length; i++) {
            this.ctx.drawImage(this.imgs[i], EDGE, EDGE)
            const pxs = this.ctx.getImageData(0, 0, WIDTH, HEIGHT).data
            this.partSets[i] = this._processImg(pxs)
        }
        this.parts = this.partSets[0].map((part) => part.clone())
        this.canvas.style.display = "block"
        this.imgs[0].style.display = "none"
        this.imgs[1].style.display = "block"
    }
    _processImg(pxs) {
        const parts = []
        for (let y = 0; y < HEIGHT; y += PART_SIZE) {
            for (let x = 0; x < WIDTH; x += PART_SIZE) {
                const partData = this._getPartData(pxs, x, y)
                if (partData.isFullyTransparent) continue
                parts.push(
                    new Particle(this, x, y, partData.colors, parts.length)
                )
            }
        }
        return parts
    }
    _getPartData(pxs, partX, partY) {
        const colors = []
        let isFullyTransparent = true
        const baseI = (partY * WIDTH + partX) * 4
        for (let py = 0; py < PART_SIZE; py++) {
            for (let px = 0; px < PART_SIZE; px++) {
                const pxI = baseI + (py * WIDTH + px) * 4
                if (pxs[pxI + 3] === 0) continue
                isFullyTransparent = false
                colors.push(pxs[pxI], pxs[pxI + 1], pxs[pxI + 2], pxs[pxI + 3])
            }
        }
        return { colors, isFullyTransparent }
    }
    _setupEventListeners() {
        window.addEventListener("mousemove", this._handleMove.bind(this))
        window.addEventListener("touchmove", this._handleMove.bind(this))
        this.canvas.addEventListener("firstmove", () => {
            document.getElementById("touchHint").remove()
        })
    }
    _handleMove(event) {
        this.mouse.x = event.touches ? event.touches[0].clientX : event.clientX
        this.mouse.y = event.touches ? event.touches[0].clientY : event.clientY
        const canvasRect = this.canvas.getBoundingClientRect()
        const canvasScale = WIDTH / canvasRect.width
        this.mouse.x = (this.mouse.x - canvasRect.left) * canvasScale
        this.mouse.y = (this.mouse.y - canvasRect.top) * canvasScale
        if (this.mouse.radiusSq < this.mouse.maxRadiusSq) {
            this.mouse.radiusSq +=
                this.mouse.radiusSq ** 0.5 * this.mouse.radiusGrowth
        }
        if (!this.firstMoveDispatched) {
            this.canvas.dispatchEvent(new CustomEvent("firstmove"))
            this.firstMoveDispatched = true
        }
    }
    update() {
        this._checkImgSwitch()
        this.ctx.clearRect(0, 0, WIDTH, HEIGHT)
        const frameBuffer = this.ctx.createImageData(WIDTH, HEIGHT)
        this.parts.forEach((part) => {
            this._drawParticle(part, frameBuffer)
            part.update()
        })
        this.ctx.putImageData(frameBuffer, 0, 0)
        this._updateMouseRadius()
    }
    _drawParticle(part, frameBuffer) {
        const partX = Math.round(part.x)
        const partY = Math.round(part.y)
        for (let py = 0; py < PART_SIZE; py++) {
            for (let px = 0; px < PART_SIZE; px++) {
                const xPos = partX + px
                const yPos = partY + py
                if (xPos < 0 || xPos >= WIDTH || yPos < 0 || yPos >= HEIGHT)
                    continue
                const imgI = (yPos * WIDTH + xPos) * 4
                const colorI = (py * PART_SIZE + px) * 4
                frameBuffer.data[imgI] = part.colors[colorI]
                frameBuffer.data[imgI + 1] = part.colors[colorI + 1]
                frameBuffer.data[imgI + 2] = part.colors[colorI + 2]
                frameBuffer.data[imgI + 3] = part.colors[colorI + 3]
            }
        }
    }
    _updateMouseRadius() {
        this.mouse.radiusSq -= this.mouse.radiusSq ** 0.5 * RADIUS_DECAY
        if (this.mouse.radiusSq < 1) this.mouse.radiusSq = 1
    }
    _checkImgSwitch() {
        const usingNextCount = this.parts.filter((part) => {
            if (!part.wasInteracted) return
            return (
                Math.abs(part.x - part.originX) > PIXEL_DISTANCE ||
                Math.abs(part.y - part.originY) > PIXEL_DISTANCE
            )
        }).length
        const progress = usingNextCount / this.parts.length / SWITCH_THRESHOLD
        if (progress >= 0.99) {
            this.lastSwitchTime = performance.now()
            this.parts.forEach((part) => (part.wasInteracted = false))
        }

        if (this.lastSwitchTime + SWITCH_TIME < performance.now()) {
            this.progressEl.style.width = `${(progress * 101).toFixed(1)}%`
            this.percentageEl.innerText = `${(progress * 100).toFixed(0)}%`
            if (this.firstTime) {
                this.parts.forEach((part) => {
                    part.useNextImgColor()
                    part.reset()
                    part.wasInteracted = false
                })
                this.imgs[this.nextImgI].style.display = "none"
                this.nextImgI = (this.nextImgI + 1) % this.imgs.length
                this.imgs[this.nextImgI].style.display = "block"
                this.mouse.radiusSq = 1
                this.mouse.maxRadiusSq = RADIUS ** 2
                this.mouse.radiusGrowth = RADIUS_GROWTH
            }
            this.firstTime = false
        } else if (this.lastSwitchTime + SWITCH_TIME > performance.now()) {
            this.progressEl.style.width = `100%`
            this.percentageEl.innerText = "Готово!"
            this.firstTime = true
            this.mouse.maxRadiusSq = 400 ** 2
            this.mouse.radiusGrowth = RADIUS_GROWTH_2
            this._handleMove({
                clientX: window.innerWidth / 2 + 1,
                clientY: window.innerHeight / 2 + 1,
            })
        }
    }
}
class Particle {
    constructor(effect, x, y, colors, i) {
        this.effect = effect
        this.wasInteracted = false
        this.originX = Math.floor(x)
        this.originY = Math.floor(y)
        this.x = this.originX
        this.y = this.originY
        this.colors = colors
        this.i = i
        this.vx = 0
        this.vy = 0
        this.ease = 0.05
        this.dx = 0
        this.dy = 0
        this.distanceSquared = 0
        this.force = 0
        this.angle = 0
    }
    update() {
        // calculate mouse forces
        this.dx = this.effect.mouse.x - this.x
        this.dy = this.effect.mouse.y - this.y
        this.distanceSquared = this.dx ** 2 + this.dy ** 2
        this.distanceSquared = Math.max(this.distanceSquared, 0.1)
        if (this.distanceSquared < this.effect.mouse.radiusSq) {
            if (this.effect.lastSwitchTime + SWITCH_TIME < performance.now()) {
                this.wasInteracted = true
                if (this.type === EFFECT_TYPES.CHANGE) {
                    this.useNextImgColor()
                }
            }
            this.force = -this.effect.mouse.radiusSq / this.distanceSquared
            this.force *= Math.random() * FORCE_MULTIPLIER
            this.angle = Math.atan2(this.dy, this.dx)
            this.vx += this.force * Math.cos(this.angle)
            this.vy += this.force * Math.sin(this.angle)
        }
        // apply motion
        this.vx *= FRICTION
        this.vy *= FRICTION
        this.x += this.vx
        this.y += this.vy
        if (this.type === EFFECT_TYPES.CHANGE) {
            this.x += this.originX - this.x
            this.y += this.originY - this.y
        }
    }
    useNextImgColor() {
        this.colors = this.effect.partSets[this.effect.nextImgI][this.i].colors
    }
    reset() {
        this.x = this.originX
        this.y = this.originY
        this.vx = 0
        this.vy = 0
    }
    clone() {
        return new Particle(
            this.effect,
            this.originX,
            this.originY,
            [...this.colors],
            this.i
        )
    }
}
