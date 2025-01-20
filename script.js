class PerfMonitor {
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
class Particle {
    constructor(effect, x, y, colors) {
        this.effect = effect
        this.originX = Math.floor(x)
        this.originY = Math.floor(y)
        this.x = this.originX
        this.y = this.originY
        this.colors = colors
        this.size = this.effect.gap
        this.vx = 0
        this.vy = 0
        this.ease = 0.05
        this.friction = 0.8
        this.dx = 0
        this.dy = 0
        this.distance = 0
        this.force = 0
        this.angle = 0
    }
    update() {
        this.dx = this.effect.mouse.x - this.x
        this.dy = this.effect.mouse.y - this.y
        this.distance = this.dx ** 2 + this.dy ** 2
        this.distance = Math.max(this.distance, 0.1)
        if (this.distance < this.effect.mouse.radius) {
            this.force = -this.effect.mouse.radius / this.distance
            this.angle = Math.atan2(this.dy, this.dx)
            this.vx += this.force * Math.cos(this.angle)
            this.vy += this.force * Math.sin(this.angle)
        }
        this.vx *= this.friction
        this.vy *= this.friction
        this.x += this.vx + (this.originX - this.x) * this.ease
        this.y += this.vy + (this.originY - this.y) * this.ease
    }
}
class Effect {
    constructor(width, height, image, hint) {
        this.width = width
        this.height = height
        this.particlesArray = []
        this.image = image
        this.hint = hint
        this.x = this.width * 0.5 - this.image.width * 0.5
        this.y = this.height * 0.5 - this.image.height * 0.5
        this.gap = 15
        this.mouse = {
            fullRadius: 50 ** 2,
            radius: 1,
            x: undefined,
            y: undefined,
        }
        window.addEventListener("mousemove", (event) => {
            this.mouse.x = event.x
            this.mouse.y = event.y
            this.handleMove()
        })
        window.addEventListener("touchmove", (event) => {
            this.mouse.x = event.touches[0].clientX
            this.mouse.y = event.touches[0].clientY
            this.handleMove()
        })
    }
    handleMove() {
        if (this.mouse.radius < this.mouse.fullRadius) {
            this.mouse.radius += this.mouse.radius ** 0.5 * 5
        }
        if (this.hint) this.hint.remove()
    }
    init(ctx) {
        ctx.drawImage(this.image, this.x, this.y)
        const pixels = ctx.getImageData(0, 0, this.width, this.height).data
        for (let y = 0; y < this.height; y += this.gap) {
            for (let x = 0; x < this.width; x += this.gap) {
                const i = (y * this.width + x) * 4
                const colors = []
                for (let yy = 0; yy < this.gap; yy++) {
                    for (let xx = 0; xx < this.gap; xx++) {
                        const ii = i + (yy * this.width + xx) * 4
                        colors.push(pixels[ii])
                        colors.push(pixels[ii + 1])
                        colors.push(pixels[ii + 2])
                        colors.push(pixels[ii + 3])
                    }
                }
                this.particlesArray.push(new Particle(this, x, y, colors))
            }
        }
        this.image.style.display = "none"
    }
    draw(ctx) {
        const imageData = ctx.createImageData(this.width, this.height)
        const data = imageData.data
        this.particlesArray.forEach((particle) => {
            const x = Math.round(particle.x)
            const y = Math.round(particle.y)
            for (let i = 0; i < this.gap; i++) {
                for (let j = 0; j < this.gap; j++) {
                    if (
                        x + i < 0 ||
                        x + i >= this.width ||
                        y + j < 0 ||
                        y + j >= this.height
                    ) {
                        continue
                    }
                    const ii = ((y + j) * this.width + (x + i)) * 4
                    let jj = (j * this.gap + i) * 4
                    data[ii] = particle.colors[jj]
                    data[ii + 1] = particle.colors[jj + 1]
                    data[ii + 2] = particle.colors[jj + 2]
                    data[ii + 3] = particle.colors[jj + 3]
                }
            }
        })
        ctx.putImageData(imageData, 0, 0)
    }
    update() {
        this.mouse.radius -= this.mouse.radius ** 0.5 * 2
        if (this.mouse.radius < 1) this.mouse.radius = 1
        this.particlesArray.forEach((particle) => particle.update())
    }
}
window.addEventListener("load", function () {
    const canvas = document.getElementsByTagName("canvas")[0]
    const ctx = canvas.getContext("2d")
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const image = document.getElementById("image1")
    const hint = document.getElementById("touchHint")
    const effect = new Effect(canvas.width, canvas.height, image, hint)
    effect.init(ctx)
    // const perfMonitor = new PerfMonitor(60)
    function animate() {
        // perfMonitor.start()
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        effect.draw(ctx)
        effect.update()
        // perfMonitor.end()
        requestAnimationFrame(animate)
    }
    animate()
})
