## 项目
SimulateSystem是一个虚拟的毛笔模拟系统，可以通过控制虚拟毛笔的姿态以及笔头的弯曲程度来显示画出来的图案。

## 需求
毛笔的姿态：主要通过毛笔的X，Y，Z三个轴来确定，共有6个自由度，分别是：
- X轴：加速度a_X，偏角α；
- Y轴：加速度a_Y，偏角Θ；
- Z轴：加速度a_Z，偏角β。

笔头的弯曲程度：主要通过弯曲后和弯曲前的长度差与原长之比来计算，具体是：
- δ = Δl/l1 = (l2-l1)/l1
- 其中：δ表示弯曲长度系数，Δl为弯曲前后的长度差，l1为原长，l2为弯曲后的长度。

具体操作过程：当确定了上述8个自变量后（加速度a_X，偏角α，加速度a_Y，偏角Θ，加速度a_Z，偏角β，l1，l2），并且知道毛笔头的尺寸和形状，就需要把那个图案给画出来。

## 参考方案
- Q：让宽度控制器变成可变的
class BrushSimulator {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.mouseDown = false; 

        // 笔触参数
        this.params = {
            ax: 0,
            alpha: 0,
            ay: 0,
            theta: 0,
            az: 0,
            beta: 0,
            l1: 50,
            l2: 50,
            x: 400,
            y: 300,
            width: 5,
            // 添加宽度控制相关参数
            minWidth: 2,    // 最小宽度
            maxWidth: 10,   // 最大宽度
            pressure: 0.5   // 压力系数 (0-1)
        };

        // ... existing code ...
    }

    draw(e) {
        if (!this.isDrawing || !this.mouseDown) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 计算当前点与上一个点之间的速度
        const dx = x - this.lastX;
        const dy = y - this.lastY;
        const speed = Math.sqrt(dx * dx + dy * dy);
        
        // 根据速度和压力计算动态宽度
        const speedFactor = Math.max(0, 1 - speed / 100); // 速度越快，线条越细
        const width = this.params.minWidth + 
            (this.params.maxWidth - this.params.minWidth) * 
            this.params.pressure * speedFactor;

        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineWidth = width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = '#000';
        
        this.ctx.lineTo(x, y);
        this.ctx.stroke();

        this.lastX = x;
        this.lastY = y;
    }

    updateParams(params) {
        // 确保pressure在0-1范围内
        if (params.pressure !== undefined) {
            params.pressure = Math.max(0, Math.min(1, params.pressure));
        }
        Object.assign(this.params, params);
    }
}

// 更新压力值
brushSimulator.updateParams({ pressure: 0.8 });

// 更新宽度范围
brushSimulator.updateParams({
    minWidth: 1,
    maxWidth: 15
});