/*
  part - particle
  px - pixel
  sq - squared
*/
const EDGE = 60
const WIDTH = 420 + EDGE * 2
const HEIGHT = 660 + EDGE * 2
const PART_SIZE = 20
const SWITCH_THRESHOLD = 0.85
const RADIUS = 50
const RADIUS_GROWTH = 5
const RADIUS_DECAY = 2
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
        const imgs = document.getElementsByTagName("img")
        this.imgsLength = imgs.length
        this.nextImg = 1
        this.switchTimestamp = 0
        this.canvas = document.getElementsByTagName("canvas")[0]
        this.canvas.width = WIDTH
        this.canvas.height = HEIGHT
        this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })
        this.partSet = []
        this.particles = []
        this.mouse = {
            fullRadiusSq: RADIUS ** 2,
            radiusSq: 1,
            x: undefined,
            y: undefined,
        }
        this.firstMoveDispatched = false
        for (let i = 0; i < this.imgsLength; i++) {
            this.partSet[i] = []
            this.ctx.drawImage(imgs[0], EDGE, EDGE)
            const pixels = this.ctx.getImageData(0, 0, WIDTH, HEIGHT).data
            for (let partY = 0; partY < HEIGHT; partY += PART_SIZE) {
                for (let partX = 0; partX < WIDTH; partX += PART_SIZE) {
                    const partDataIndex = (partY * WIDTH + partX) * 4
                    const colors = []
                    let allAlphaTransparent = true
                    for (let pxY = 0; pxY < PART_SIZE; pxY++) {
                        for (let pxX = 0; pxX < PART_SIZE; pxX++) {
                            const pxI = partDataIndex + (pxY * WIDTH + pxX) * 4
                            if (pixels[pxI + 3] === 0) continue
                            allAlphaTransparent = false
                            colors.push(pixels[pxI])
                            colors.push(pixels[pxI + 1])
                            colors.push(pixels[pxI + 2])
                            colors.push(pixels[pxI + 3])
                        }
                    }
                    if (allAlphaTransparent) continue
                    const partI = this.partSet[i].length
                    this.partSet[i].push(
                        new Particle(this, partX, partY, colors, partI)
                    )
                }
            }
            imgs[0].remove()
        }

        this.particles = this.partSet[0].map((particle) => particle.clone())
        this.canvas.style.display = "block"
        window.addEventListener("mousemove", this.handleMove.bind(this))
        window.addEventListener("touchmove", this.handleMove.bind(this))
        this.canvas.addEventListener("firstmove", () => {
            document.getElementById("touchHint").remove()
        })
    }
    handleMove(event) {
        this.mouse.x = event.touches ? event.touches[0].clientX : event.clientX
        this.mouse.y = event.touches ? event.touches[0].clientY : event.clientY
        const clientRect = this.canvas.getBoundingClientRect()
        const scaleRatio = WIDTH / clientRect.width
        this.mouse.x = (this.mouse.x - clientRect.left) * scaleRatio
        this.mouse.y = (this.mouse.y - clientRect.top) * scaleRatio
        if (this.mouse.radiusSq < this.mouse.fullRadiusSq) {
            this.mouse.radiusSq += this.mouse.radiusSq ** 0.5 * RADIUS_GROWTH
        }
        if (!this.firstMoveDispatched) {
            this.canvas.dispatchEvent(new CustomEvent("firstmove"))
            this.firstMoveDispatched = true
        }
    }
    update() {
        this.ctx.clearRect(0, 0, WIDTH, HEIGHT)
        const imgData = this.ctx.createImageData(WIDTH, HEIGHT)
        this.particles.forEach((particle) => {
            const partX = Math.round(particle.x)
            const partY = Math.round(particle.y)
            for (let pxY = 0; pxY < PART_SIZE; pxY++) {
                for (let pxX = 0; pxX < PART_SIZE; pxX++) {
                    if (
                        partX + pxX < 0 ||
                        partX + pxX >= WIDTH ||
                        partY + pxY < 0 ||
                        partY + pxY >= HEIGHT
                    ) {
                        continue
                    }
                    const pxI = ((partY + pxY) * WIDTH + (partX + pxX)) * 4
                    let colorI = (pxY * PART_SIZE + pxX) * 4
                    imgData.data[pxI] = particle.colors[colorI]
                    imgData.data[pxI + 1] = particle.colors[colorI + 1]
                    imgData.data[pxI + 2] = particle.colors[colorI + 2]
                    imgData.data[pxI + 3] = particle.colors[colorI + 3]
                }
            }
        })
        this.ctx.putImageData(imgData, 0, 0)
        this.mouse.radiusSq -= this.mouse.radiusSq ** 0.5 * RADIUS_DECAY
        if (this.mouse.radiusSq < 1) this.mouse.radiusSq = 1
        let fromNextCounter = 0
        this.particles.forEach((particle) => {
            particle.update()
            if (particle.fromNext) fromNextCounter++
        })
        if (fromNextCounter / this.particles.length > SWITCH_THRESHOLD) {
            this.switchTimestamp = performance.now()
            this.particles.forEach((particle) => {
                particle.fromNext = false
                particle.updateColor()
            })
            this.nextImg = (this.nextImg + 1) % this.imgsLength
        }
    }
}
class Particle {
    constructor(effect, x, y, colors, i) {
        this.effect = effect
        this.fromNext = false
        this.originX = Math.floor(x)
        this.originY = Math.floor(y)
        this.x = this.originX
        this.y = this.originY
        this.colors = colors
        this.i = i
        this.vx = 0
        this.vy = 0
        this.ease = 0.05
        this.friction = 0.8
        this.dx = 0
        this.dy = 0
        this.distanceSquared = 0
        this.force = 0
        this.angle = 0
    }
    update() {
        this.dx = this.effect.mouse.x - this.x
        this.dy = this.effect.mouse.y - this.y
        this.distanceSquared = this.dx ** 2 + this.dy ** 2
        this.distanceSquared = Math.max(this.distanceSquared, 0.1)
        if (this.distanceSquared < this.effect.mouse.radiusSq) {
            if (this.effect.switchTimestamp + 1500 < performance.now()) {
                this.updateColor()
                this.fromNext = true
            }
            this.force = -this.effect.mouse.radiusSq / this.distanceSquared
            this.angle = Math.atan2(this.dy, this.dx)
            this.vx += this.force * Math.cos(this.angle)
            this.vy += this.force * Math.sin(this.angle)
        }
        this.vx *= this.friction
        this.vy *= this.friction
        this.x += this.vx + (this.originX - this.x) * this.ease
        this.y += this.vy + (this.originY - this.y) * this.ease
    }
    updateColor() {
        this.colors = this.effect.partSet[this.effect.nextImg][this.i].colors
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
