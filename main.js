document.addEventListener('DOMContentLoaded', () => {
    /* DOM内容加载事件监听 */

    // 捕获canvas元素
    const canvas = document.getElementById('canvas');

    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    // 创建笔刷系统
    const brushSimulator = new BrushSimulator(canvas);
    console.log('Simulator created');

    // 所有参数的配置
    const params = {
        ax: { id: 'ax', min: -10, max: 10, default: 0, step: 0.1 },
        alpha: { id: 'alpha', min: 0, max: 360, default: 0, step: 1 },
        ay: { id: 'ay', min: -10, max: 10, default: 0, step: 0.1 },
        theta: { id: 'theta', min: 0, max: 360, default: 0, step: 1 },
        az: { id: 'az', min: -10, max: 10, default: 0, step: 0.1 },
        beta: { id: 'beta', min: 0, max: 360, default: 0, step: 1 },
        deltaL: { id: 'deltaL', min: 0, max: 20, default: 0, step: 0.1 },
        minWidth: { id: 'minWidth', min: 1, max: 5, default: 2, step: 0.5 },
        maxWidth: { id: 'maxWidth', min: 5, max: 20, default: 10, step: 0.5 },
        width: { id: 'width', min: 2, max: 10, default: 6, step: 0.5 },
        pressure: { id: 'pressure', min: 0, max: 1, default: 0.5, step: 0.1 }
    }

    // 为笔触参数设置事件监听器
    Object.entries(params).forEach(([key, config]) => {
        const slider = document.getElementById(config.id);
        const valueDisplay = document.getElementById(`${config.id}-value`);
        
        if (slider && valueDisplay) {
            // 设置初始值
            slider.value = config.default;
            valueDisplay.textContent = config.default;

            // 添加事件监听
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                valueDisplay.textContent = value;

                // 更新画笔参数
                const updateObj = {}
                updateObj[key] = value;
                brushSimulator.updateParams(updateObj);
            });
        }
    });

    // 笔刷颜色选择器的事件监听器
    const colorPicker = document.getElementById('colorPicker');
    colorPicker.addEventListener('input', (event) => {
        const selectedColor = event.target.value; // 获取选择的颜色
        brushSimulator.updateColor(selectedColor); // 更新笔刷颜色
    });

    // 橡皮擦的事件监听器
    document.getElementById('eraserTool').addEventListener('click', () => {
        brushSimulator.toggleEraser(); // 切换橡皮擦状态
    })
    

    // 添加调试按钮
    // const debugButton = document.createElement('button');
    // debugButton.textContent = '调试笔触参数';
    // debugButton.onclick = () => brushSimulator.debugDraw();
    // const debug = document.getElementById('debug');
    // debug.appendChild(debugButton);

    // 添加画布事件监听
    canvas.addEventListener('mousedown', (e) => brushSimulator.startDrawing(e));
    canvas.addEventListener('mousemove', (e) => brushSimulator.draw(e));
    canvas.addEventListener('mouseup', () => brushSimulator.stopDrawing());
    canvas.addEventListener('mouseout', () => brushSimulator.stopDrawing());
    
});