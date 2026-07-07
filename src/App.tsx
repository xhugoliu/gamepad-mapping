import UpdateElectron from "@/components/update";
import { useCallback, useEffect, useState } from "react";
import "./App.css";
import {
  ControllerVisualization,
  SelectedControl,
} from "./components/ControllerVisualization";
import { DeviceList } from "./components/DeviceList";
import { MappingPanel } from "./components/MappingPanel";
import { useGamepad } from "./hooks/useGamepad";
import { useGamepadMapping } from "./hooks/useGamepadMapping";

function App() {
  const gamepads = useGamepad();
  const {
    getLayers,
    getLayerView,
    ensureLayer,
    setButtonMapping,
    setAxisMapping,
    setDpadMapping,
    setComboMapping,
    removeButtonMapping,
    removeAxisMapping,
    removeDpadMapping,
    removeComboMapping,
    editingButton,
    setEditingButton,
    editingAxis,
    setEditingAxis,
    editingDpad,
    setEditingDpad,
  } = useGamepadMapping(gamepads);

  const [selectedGamepadIndex, setSelectedGamepadIndex] = useState<
    number | null
  >(null);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0);
  const [selectedControl, setSelectedControl] = useState<SelectedControl>(null);

  // Automatically select the first gamepad if available
  useEffect(() => {
    if (gamepads.length > 0 && selectedGamepadIndex === null) {
      setSelectedGamepadIndex(gamepads[0].index);
    } else if (gamepads.length === 0) {
      setSelectedGamepadIndex(null);
      setSelectedLayerIndex(0);
      setSelectedControl(null);
    }
  }, [gamepads, selectedGamepadIndex]);

  const selectedGamepad = gamepads.find(
    (g) => g.index === selectedGamepadIndex
  );
  const selectedGamepadId = selectedGamepad?.index ?? null;
  const selectedLayers =
    selectedGamepadId !== null ? getLayers(selectedGamepadId) : [];
  const selectedMapping =
    selectedGamepadId !== null
      ? getLayerView(selectedGamepadId, selectedLayerIndex)
    : undefined;

  useEffect(() => {
    if (selectedGamepadId === null || selectedLayers.length === 0) {
      return;
    }

    const selectedLayerExists = selectedLayers.some(
      (layer) => layer.layerIndex === selectedLayerIndex
    );
    if (!selectedLayerExists) {
      setSelectedLayerIndex(selectedLayers[0].layerIndex);
    }
  }, [selectedGamepadId, selectedLayerIndex, selectedLayers]);

  const handleControlSelect = useCallback(
    (control: SelectedControl) => {
      setSelectedControl(control);
      setEditingButton(null);
      setEditingAxis(null);
      setEditingDpad(null);
    },
    [setEditingButton, setEditingAxis, setEditingDpad]
  );

  const handleSelectGamepad = (index: number) => {
    setSelectedGamepadIndex(index);
    setSelectedLayerIndex(0);
    setSelectedControl(null);
  };

  const handleAddLayer = useCallback(() => {
    if (selectedGamepadId === null) {
      return;
    }

    const existingLayerIndices = new Set(
      selectedLayers.map((layer) => layer.layerIndex)
    );
    let nextLayerIndex = 1;
    while (existingLayerIndices.has(nextLayerIndex)) {
      nextLayerIndex += 1;
    }

    ensureLayer(selectedGamepadId, nextLayerIndex);
    setSelectedLayerIndex(nextLayerIndex);
    handleControlSelect(null);
  }, [ensureLayer, handleControlSelect, selectedGamepadId, selectedLayers]);

  return (
    <div className="app">
      {gamepads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎮</div>
          <h1>No Gamepad Detected</h1>
          <p>Connect a controller and press any button to activate it.</p>
        </div>
      ) : (
        <div className="app-container">
          <DeviceList
            gamepads={gamepads}
            selectedGamepadIndex={selectedGamepadIndex}
            onSelectGamepad={handleSelectGamepad}
          />

          <main className="visualization-panel">
            {selectedGamepad && (
              <>
                <div className="panel-header">
                  <h2>
                    {selectedGamepad.id.split("(")[0].trim() ||
                      `Gamepad ${selectedGamepad.index + 1}`}
                  </h2>
                  <p className="panel-subtitle">{selectedGamepad.id}</p>
                </div>
                <div className="visualization-content">
                  <ControllerVisualization
                    gamepad={selectedGamepad}
                    mapping={selectedMapping}
                    selectedControl={selectedControl}
                    onControlSelect={handleControlSelect}
                  />
                </div>
              </>
            )}
          </main>

          <aside className="mapping-panel">
            <div className="panel-header">
              <h2>Mapping</h2>
              {selectedGamepad && (
                <div className="layer-toolbar">
                  <label htmlFor="layer-select">Layer</label>
                  <select
                    id="layer-select"
                    value={selectedLayerIndex}
                    onChange={(event) => {
                      setSelectedLayerIndex(Number(event.target.value));
                      handleControlSelect(null);
                    }}
                  >
                    {selectedLayers.map((layer) => (
                      <option key={layer.layerIndex} value={layer.layerIndex}>
                        {layer.layerIndex}: {layer.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="layer-add-button"
                    type="button"
                    onClick={handleAddLayer}
                    title="Add layer"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
            <div className="mapping-content">
              {selectedGamepad ? (
                <MappingPanel
                  gamepad={selectedGamepad}
                  mapping={selectedMapping}
                  selectedControl={selectedControl}
                  onSetButtonMapping={(buttonIndex, key, label, action) =>
                    setButtonMapping(
                      selectedGamepad.index,
                      buttonIndex,
                      key,
                      label,
                      action,
                      selectedLayerIndex
                    )
                  }
                  onSetAxisMapping={(
                    stickIndex,
                    direction,
                    key,
                    label,
                    threshold,
                    type,
                    sensitivity,
                    acceleration,
                    invertX,
                    invertY,
                    action,
                    directionGapDegrees
                  ) =>
                    setAxisMapping(
                      selectedGamepad.index,
                      stickIndex,
                      direction,
                      key,
                      label,
                      threshold,
                      type,
                      sensitivity,
                      acceleration,
                      invertX,
                      invertY,
                      action,
                      selectedLayerIndex,
                      directionGapDegrees
                    )
                  }
                  onSetDpadMapping={(direction, key, label, action) =>
                    setDpadMapping(
                      selectedGamepad.index,
                      direction,
                      key,
                      label,
                      action,
                      selectedLayerIndex
                    )
                  }
                  onSetComboMapping={(comboMapping) =>
                    setComboMapping(
                      selectedGamepad.index,
                      comboMapping,
                      selectedLayerIndex
                    )
                  }
                  onRemoveButtonMapping={(buttonIndex) =>
                    removeButtonMapping(
                      selectedGamepad.index,
                      buttonIndex,
                      selectedLayerIndex
                    )
                  }
                  onRemoveAxisMapping={(stickIndex, direction) =>
                    removeAxisMapping(
                      selectedGamepad.index,
                      stickIndex,
                      direction,
                      selectedLayerIndex
                    )
                  }
                  onRemoveDpadMapping={(direction) =>
                    removeDpadMapping(
                      selectedGamepad.index,
                      direction,
                      selectedLayerIndex
                    )
                  }
                  onRemoveComboMapping={(comboId) =>
                    removeComboMapping(
                      selectedGamepad.index,
                      comboId,
                      selectedLayerIndex
                    )
                  }
                  editingButton={editingButton}
                  editingAxis={editingAxis}
                  editingDpad={editingDpad}
                  onSetEditingButton={setEditingButton}
                  onSetEditingAxis={setEditingAxis}
                  onSetEditingDpad={setEditingDpad}
                  onSelectControl={handleControlSelect}
                />
              ) : (
                <div className="no-selection">
                  <div className="no-selection-icon">👆</div>
                  <p>
                    Click on a button or stick direction in the controller to
                    map it
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
      <UpdateElectron />
    </div>
  );
}

export default App;
