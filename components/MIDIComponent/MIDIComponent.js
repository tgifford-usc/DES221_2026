// This is our custom web component, which implements MIDI port access
class CustomMIDI extends HTMLElement {

    // A utility function for creating a new html element with given id and class
    static newElement(tag, id, clsName) {
      const elem = document.createElement(tag);
      elem.className = clsName;
      elem.id = id;
      return elem;
    }

    constructor() {
      // Always call super first in constructor
      super();
      
      // get access to the DOM tree for this element
      const shadow = this.attachShadow({mode: 'open'});
      
      // Apply customMidi external stylesheet to the shadow dom
      const linkElem = document.createElement('link');
      linkElem.setAttribute('rel', 'stylesheet');
      linkElem.setAttribute('href', 'components/MIDIComponent/MIDIComponent.css');

      // Attach the created elements to the shadow dom
      shadow.appendChild(linkElem);

      // create a top level full width strip to hold the component
      this.mainStrip = CustomMIDI.newElement('div', 'customMidiMainStrip', 'custom-midi main-strip vertical-panel');
      shadow.appendChild(this.mainStrip);

      // expand/collapse component
      this.titlePanel = CustomMIDI.newElement('div', 'customMidiTitlePanel', 'title-panel-collapsed horizontal-panel');
      this.mainStrip.appendChild(this.titlePanel);

      this.expandCollapseButton = CustomMIDI.newElement('button', 'customMidiExpandCollapseButton', 'expand-collapse-button collapsed');
      this.expandCollapseButton.innerHTML = "+";
      this.expandCollapseButton.addEventListener('click', (event) => {
        if (this.mainPanel.style.display === 'none') {
          this.mainPanel.style.display = 'flex';
          this.expandCollapseButton.innerHTML = "-";
          this.expandCollapseButton.classList.remove('collapsed');
          this.expandCollapseButton.classList.add('expanded');
          this.titlePanel.classList.remove('title-panel-collapsed');
          this.titlePanel.classList.add('title-panel-expanded');
        } else {
          this.mainPanel.style.display = 'none';
          this.expandCollapseButton.innerHTML = "+";
          this.expandCollapseButton.classList.remove('expanded');
          this.expandCollapseButton.classList.add('collapsed');
          this.titlePanel.classList.remove('title-panel-expanded');
          this.titlePanel.classList.add('title-panel-collapsed');
        }
      });
      this.titlePanel.appendChild(this.expandCollapseButton);

      this.mainLabel = CustomMIDI.newElement('div', 'CustomMidiMainLabel', 'custom-midi-label');
      this.mainLabel.innerHTML = "MIDI ports";
      this.titlePanel.appendChild(this.mainLabel);

      // Create a top level panel, that need not be full width
      this.mainPanel = CustomMIDI.newElement('div', 'customMidiMainPanel', 'custom-midi main-panel horizontal-panel');
      this.mainPanel.style.display = 'none';
      this.mainStrip.appendChild(this.mainPanel);

      // this.mainLabel = CustomMIDI.newElement('div', 'customMidiMainLabel', 'main-label');
      // this.mainLabel.innerHTML = "MIDI Ports";
      // this.mainPanel.appendChild(this.mainLabel);

      // Populate an input and output port table, with toggle buttons to connect/disconnect
      this.inputPortTable = CustomMIDI.newElement('div', 'customMidiInputPortTable', 'port-table vertical-panel');
      this.mainPanel.appendChild(this.inputPortTable);
      this.inputPortTableHeader = CustomMIDI.newElement('div', 'customMidiInputPortTableHeader', 'port-table-header');
      this.inputPortTableHeader.innerHTML = 'MIDI Inputs';
      this.inputPortTable.appendChild(this.inputPortTableHeader);

      this.outputPortTable = CustomMIDI.newElement('div', 'customMidiOutputPortTable', 'port-table vertical-panel');
      this.mainPanel.appendChild(this.outputPortTable);
      this.outputPortTableHeader = CustomMIDI.newElement('div', 'customMidiOutputPortTableHeader', 'port-table-header');
      this.outputPortTableHeader.innerHTML = 'MIDI Outputs';
      this.outputPortTable.appendChild(this.outputPortTableHeader);

      // create a textbox for soloing particular messages. This is helpful for MIDI learn when you can't just
      // move one controller at a time (because it is an xy-tilt for example)
      this.filterMidiTable = CustomMIDI.newElement('div', 'customFilterMidiTable', 'port-table vertical-panel');
      this.mainPanel.appendChild(this.filterMidiTable);
      
      this.filterMidiTableHeader = CustomMIDI.newElement('div', 'customMidiFilterMidiTableHeader', 'port-table-header horizontal-panel');
      this.filterMidiTable.appendChild(this.filterMidiTableHeader);

      this.filterMidiTableLabel = CustomMIDI.newElement('div', 'customMidiFilterMidiTableLabel', 'filter-tabel-label');
      this.filterMidiTableLabel.innerHTML = 'Restrict to messages starting with:';
      this.filterMidiTableHeader.appendChild(this.filterMidiTableLabel);

      this.filterMidiTableBody  = CustomMIDI.newElement('div', 'customMidiFilterMidiTableBody', 'vertical-panel');
      this.filterMidiTable.appendChild(this.filterMidiTableBody);
      this.filterMidiTableBody.style.display = 'none';

      this.filterMidiExpandCollapseButton = CustomMIDI.newElement('button', 'customMidiFilterMidiExpandCollapseButton', 'expand-collapse-button collapsed');
      this.filterMidiExpandCollapseButton.innerHTML = "+";
      this.filterMidiExpandCollapseButton.addEventListener('click', (event) => {
        if (this.filterMidiTableBody.style.display === 'none') {
          this.filterMidiTableBody.style.display = 'flex';
          this.filterMidiExpandCollapseButton.innerHTML = "-";
          this.filterMidiExpandCollapseButton.classList.remove('collapsed');
          this.filterMidiExpandCollapseButton.classList.add('expanded');
          // this.titlePanel.classList.remove('title-panel-collapsed');
          // this.titlePanel.classList.add('title-panel-expanded');
        } else {
          this.filterMidiTableBody.style.display = 'none';
          this.filterMidiExpandCollapseButton.innerHTML = "+";
          this.filterMidiExpandCollapseButton.classList.remove('expanded');
          this.filterMidiExpandCollapseButton.classList.add('collapsed');
          // this.titlePanel.classList.remove('title-panel-expanded');
          // this.titlePanel.classList.add('title-panel-collapsed');
        }
      });
      this.filterMidiTableHeader.appendChild(this.filterMidiExpandCollapseButton);

      // keep a list of observed midi messages
      this.filteredMessages = new Map();
    }
  

    populatePortTables() {
      if (this.midi) {
        if (this.midi.inputs) {
          this.midi.inputs.forEach((inputPort) => {
            // a panel to hold the name of the port, and a toggle button for connecting
            const inputPortPanel = CustomMIDI.newElement('div', `inputPortPanel_${inputPort.id}`, 'port-panel horizontal-panel'); 
            this.inputPortTable.appendChild(inputPortPanel);
            // the name of the midi port
            const inputPortName = CustomMIDI.newElement('div', `customMidiInputPortName_${inputPort.id}`, 'port-name');
            inputPortName.innerHTML = `${inputPort.manufacturer} ${inputPort.name}`;
            inputPortPanel.appendChild(inputPortName);
            // toggle button for connecting
            const inputPortToggle = CustomMIDI.newElement('button', `inputPortToggle_${inputPort.id}`, 'port-toggle toggled-off');
            inputPortToggle.innerHTML = "Connect";
            inputPortPanel.appendChild(inputPortToggle);
            if (inputPort.connection == 'open') {
              inputPortToggle.classList.remove('toggled-off');
              inputPortToggle.classList.add('toggled-on');
              inputPortToggle.innerHTML = "Disconnect";
            }
            inputPortToggle.addEventListener('click', async (event) => {
              if (inputPortToggle.classList.contains('toggled-on')) {
                await inputPort.close();
                inputPortToggle.classList.remove('toggled-on');
                inputPortToggle.classList.add('toggled-off');
                inputPortToggle.innerHTML = 'Connect';
              } else {
                await inputPort.open();
                inputPortToggle.classList.remove('toggled-off');
                inputPortToggle.classList.add('toggled-on');
                inputPortToggle.innerHTML = 'Disconnect';
              }          
            });
          });
        }
      
        if (this.midi.outputs) {
          this.midi.outputs.forEach((outputPort) => {
            // a panel to hold the name of the port, and a toggle button for connecting
            const outputPortPanel = CustomMIDI.newElement('div', `outputPortPanel_${outputPort.id}`, 'port-panel horizontal-panel'); 
            this.outputPortTable.appendChild(outputPortPanel);
            // the name of the midi port
            const outputPortName = CustomMIDI.newElement('div', `customMidiOutputPortName_${outputPort.id}`, 'port-name');
            //outputPortName.innerHTML = ` id:${outputPort.id} manufacturer: ${outputPort.manufacturer} name: ${outputPort.name} version:${outputPort.version}`;
            outputPortName.innerHTML = `${outputPort.manufacturer} ${outputPort.name}`;
            outputPortPanel.appendChild(outputPortName);
            // toggle button for connecting
            const outputPortToggle = CustomMIDI.newElement('button', `outputPortToggle_${outputPort.id}`, 'port-toggle toggled-off');
            outputPortToggle.innerHTML = "Connect";
            outputPortPanel.appendChild(outputPortToggle);
            if (outputPort.connection == 'open') {
              outputPortToggle.classList.remove('toggled-off');
              outputPortToggle.classList.add('toggled-on');
              outputPortToggle.innerHTML = "Disconnect";
            }
            outputPortToggle.addEventListener('click', async (event) => {
              if (outputPortToggle.classList.contains('toggled-on')) {
                await outputPort.close();
                outputPortToggle.classList.remove('toggled-on');
                outputPortToggle.classList.add('toggled-off');
                outputPortToggle.innerHTML = 'Connect';
              } else {
                await outputPort.open();
                outputPortToggle.classList.remove('toggled-off');
                outputPortToggle.classList.add('toggled-on');
                outputPortToggle.innerHTML = 'Disconnect';
              }          
            });
          });
        }
      }
    }

    // utilities for manipulating midi messages
    midiMessageSignature(msgByteArray) {
      return (msgByteArray[0] << 8) + msgByteArray[1];
    }

    addMidiMessageToFilterList(msgByteArray) {
      const msgSignature = this.midiMessageSignature(msgByteArray);
      if (!this.filteredMessages.has(msgSignature)) {
        this.filteredMessages.set(msgSignature, true);
        const msgType = msgByteArray[0] >> 4;
        const msgChannel = msgByteArray[0] - (msgType << 4);
        const msgSelector = msgByteArray[1];

        const filterMidiPanel = CustomMIDI.newElement('div', 'CustomMidiFilterMidiPanel', 'port-panel horizontal-panel'); 
        this.filterMidiTableBody.appendChild(filterMidiPanel);
        const filterMidiMsg = CustomMIDI.newElement('div', 'customMidiFilterMidiMsgType', 'port-name');
        if (msgType == 0x9) {
          filterMidiMsg.innerHTML = `Note-On Chan: ${msgChannel} Pitch: ${msgSelector}`;  
        } else if (msgType == 0x8) {
          filterMidiMsg.innerHTML = `Note-Off Chan: ${msgChannel} Pitch: ${msgSelector}`;  
        } else if (msgType == 0xB) {
          filterMidiMsg.innerHTML = `Control-Change Chan: ${msgChannel} Controller: ${msgSelector}`;  
        }
        filterMidiPanel.appendChild(filterMidiMsg);
        // toggle button for connecting
        const filterMidiToggle = CustomMIDI.newElement('button', `filterMidiToggle_${this.filteredMessages.size}`, 'midi-message-toggle toggled-on');
        filterMidiToggle.innerHTML = "Disallow";
        filterMidiPanel.appendChild(filterMidiToggle);
        filterMidiToggle.addEventListener('click', async (event) => {
          if (filterMidiToggle.classList.contains('toggled-on')) {
            this.filteredMessages.set(msgSignature, false);
            filterMidiToggle.classList.remove('toggled-on');
            filterMidiToggle.classList.add('toggled-off');
            filterMidiToggle.innerHTML = 'Allow';
          } else {
            this.filteredMessages.set(msgSignature, true);
            filterMidiToggle.classList.remove('toggled-off');
            filterMidiToggle.classList.add('toggled-on');
            filterMidiToggle.innerHTML = 'Disallow';
          }          
        });
      }        
    }

    connectedCallback() {
      console.log('MIDI custom element added to page.');
      this.init();
    }
  
    async init() {
      this.midi = await navigator.requestMIDIAccess();
      this.populatePortTables();
    }
 
    sendNoteOn(pitch, velocity, channel) {
      const noteOnMessage = [0x90 + channel, pitch, velocity];
      this.addMidiMessageToFilterList(noteOnMessage);
      
      const noteOnSignature = this.midiMessageSignature(noteOnMessage);      
      if (this.filteredMessages.get(noteOnSignature)) {
        this.midi.outputs.forEach((outputPort) => {
          if (outputPort.connection == "open") {
            outputPort.send(noteOnMessage);
          }
        });
      }
    }  

    sendNoteOff(pitch, velocity, channel) {
      const noteOffMessage = [0x80 + channel, pitch, velocity];
      this.addMidiMessageToFilterList(noteOffMessage);

      const noteOffSignature = this.midiMessageSignature(noteOffMessage);
      if (this.filteredMessages.get(noteOffSignature)) {
        this.midi.outputs.forEach((outputPort) => {
          if (outputPort.connection == "open") {
            outputPort.send(noteOffMessage);
          }
        });
      }
    }  

    sendControlChange(controller, value, channel) {
      const controlChangeMessage = [0xB0 + channel, controller, value];
      this.addMidiMessageToFilterList(controlChangeMessage);
      
      const controlChangeSignature = this.midiMessageSignature(controlChangeMessage);
      if (this.filteredMessages.get(controlChangeSignature)) {
        this.midi.outputs.forEach((outputPort) => {
          if (outputPort.connection == "open") {
            outputPort.send(controlChangeMessage);
          }
        });
      }
    }

    // This can be overridden in a client application if a different messaging format is desired
    handleSerialMessage = function(val) {
        const noteOnMatch = val.match(/NoteOn (\d+) (\d+) (\d+)/);
        if (noteOnMatch && noteOnMatch.length == 4) {
            this.sendNoteOn(parseInt(noteOnMatch[1]), parseInt(noteOnMatch[2]), parseInt(noteOnMatch[3]));
        }
        const noteOffMatch = val.match(/NoteOff (\d+) (\d+) (\d+)/);
        if (noteOffMatch && noteOffMatch.length == 4) {
            this.sendNoteOff(parseInt(noteOffMatch[1]), parseInt(noteOffMatch[2]), parseInt(noteOffMatch[3]));
        }
        const controlChangeMatch = val.match(/ControlChange (\d+) (\d+) (\d+)/);
        if (controlChangeMatch && controlChangeMatch.length == 4) {
            this.sendControlChange(parseInt(controlChangeMatch[1]), parseInt(controlChangeMatch[2]), parseInt(controlChangeMatch[3]));
        }
    }

}
  
customElements.define('custom-midi', CustomMIDI);
