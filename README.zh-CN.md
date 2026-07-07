# Gamepad Mapping

简体中文 | [English](README.md)

Gamepad Mapping 是一个 macOS 桌面应用，用来把手柄按键、方向键和摇杆映射成键盘、鼠标、滚轮、媒体键、层操作、组合键以及 tap-hold 动作。当前映射编辑器已经改为下拉选择为主，不再依赖监听录制，因此符号键、小键盘、高位功能键、媒体键、鼠标前进/后退等不好录制的输入也可以直接配置。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)

## 功能

- 支持普通按键、D-pad、摇杆按下键的映射。
- 摇杆支持三种模式：
  - `8 Directions (Hotkeys)`：八方向热键，可配置触发阈值和相邻方向之间的角度间隔。
  - `Mouse Control`：摇杆控制鼠标移动，可配置速度、加速度和轴反转。
  - `Scroll Control`：摇杆控制滚轮，速度上限为 30，也支持加速度和轴反转。
- 支持类似键盘固件的层概念：
  - 每个设备有独立层列表，可以新增和切换层。
  - 层之间相互隔离：当前层未配置的按键不会透传到低层。
  - 层操作已经是一级分类：`MO(layer)`、`TG(layer)`、`TO(layer)`、`DF(layer)`。
- 支持组合键：
  - 可选择多个手柄输入作为组合触发条件。
  - 可配置 combo term。
  - 输出动作复用同一套映射编辑器。
- 支持 tap-hold：
  - `Mod-Tap - MT(mod, key)`：轻触输出按键，按住输出修饰键。
  - `Layer-Tap - LT(layer, key)`：轻触输出按键，按住临时切层。
  - 可配置 tapping term。
- 输入下拉分类覆盖：
  - 字母、数字行、符号、Shift 符号、中文标点、导航键、`F1`-`F24`、小键盘、修饰键、鼠标按钮、鼠标滚轮、媒体键。
  - 支持 `CTRL`、`ALT`、`SHIFT`、`META` 修饰组合。
  - 鼠标 4/5 以浏览器后退/前进形式配置。
- 可视化手柄界面，实时显示按键和摇杆状态。
- 支持多手柄。
- 映射配置保存在本地浏览器存储中。
- 保留 Electron 自动更新能力。

## 使用方式

1. 连接手柄，并按任意按键让应用检测到设备。
2. 在设备列表里选择目标手柄。
3. 在右侧 Layer 工具栏选择目标层，或新增层。
4. 在可视化手柄上点击要配置的按键、摇杆或 D-pad。
5. 在映射面板中选择 `Category`：
   - 普通输入分类，例如 Letters、Symbols、Navigation、Numpad、Mouse Buttons、Mouse Wheel、Media Keys。
   - 层操作分类，例如 `Momentary - MO(layer)`、`Toggle - TG(layer)`、`Switch - TO(layer)`、`Default - DF(layer)`。
   - Tap-hold 分类，例如 `Mod-Tap - MT(mod, key)`、`Layer-Tap - LT(layer, key)`。
6. 补充配置剩余字段，然后点击 `Apply Changes`。

编辑中可以用 `Revert Changes` 放弃未保存改动，用 `Remove Mapping` 删除已有映射。

## 摇杆模式

每个摇杆可以单独选择模式。

- `8 Directions (Hotkeys)`：把摇杆方向切成八个扇区，每个方向可以配置独立动作。Threshold 控制触发强度，Angle gap 用来给相邻方向之间留出空隙，减少误触。
- `Mouse Control`：把摇杆转换为鼠标移动。
- `Scroll Control`：把摇杆转换为滚轮滚动。

鼠标和滚轮模式都支持 deadzone、speed、acceleration、invert horizontal、invert vertical 等参数。

## 高级动作

层操作：

- `MO(layer)`：按住时临时激活目标层。
- `TG(layer)`：切换目标层的开关状态。
- `TO(layer)`：切到目标层。
- `DF(layer)`：设置默认层。

Tap-hold：

- `MT(mod, key)`：轻触输出 key，按住输出 mod。
- `LT(layer, key)`：轻触输出 key，按住临时激活 layer。

组合键：

- 选择两个或更多手柄输入作为组合。
- 组合输出可以是普通输入、层操作或 tap-hold。
- combo term 控制组合判定时间窗。

## 开发

仓库包含 `yarn.lock`，日常开发建议使用 `yarn`，避免额外生成其他锁文件。

```bash
# 克隆当前开发 fork
git clone https://github.com/xhugoliu/gamepad-mapping.git
cd gamepad-mapping

# 安装依赖
yarn install

# 启动 Electron/Vite 开发环境
yarn dev
```

常用命令：

```bash
yarn test
yarn build
```

在 macOS 上，模拟键盘和鼠标输出可能需要给应用或启动它的终端授予“辅助功能”和“输入监控”权限。

## 技术栈

- React 19 + TypeScript
- Electron 39
- Vite 7
- `@nut-tree-fork/nut-js` 输入模拟
- `electron-updater` 自动更新
- Vitest 和 Playwright 验证
- PostCSS/Tailwind 工具链与应用 CSS

## 项目结构

```text
electron/            Electron 主进程和 preload 脚本
src/components/      React UI 组件
src/constants/       输入选项、手柄布局和默认值
src/hooks/           手柄轮询、映射状态和持久化
src/types/           映射动作数据结构
src/utils/           快捷键、组合键、摇杆方向等工具
test/                单元测试
public/              静态资源
release/             构建产物
```

## 许可

本项目使用 MIT License，详见 [LICENSE](LICENSE)。

## 致谢

项目基于上游 [humbertogontijo/gamepad-mapping](https://github.com/humbertogontijo/gamepad-mapping) 和 Electron/Vite React 模板继续开发。
