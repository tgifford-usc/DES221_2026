// This custom component assumes that the file Serial.js has been loaded


// This is our custom web component, which implements Serial port access
class CustomSerial extends HTMLElement {

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
        
        // The underlying Serial Communication object
        this.serial = new Serial();

        // by default, display received messages in the received message textbox
        this.serial.customHandler = this.showMessage.bind(this);

        // get access to the DOM tree for this element
        const shadow = this.attachShadow({mode: 'open'});
        
        // Apply customMidi external stylesheet to the shadow dom
        const linkElem = document.createElement('link');
        linkElem.setAttribute('rel', 'stylesheet');
        linkElem.setAttribute('href', 'components/SerialComponent/SerialComponent.css');

        // Attach the created elements to the shadow dom
        shadow.appendChild(linkElem);

        // create a top level full width strip to hold the component
        this.mainStrip = CustomSerial.newElement('div', 'customSerialMainStrip', 'custom-serial main-strip');
        shadow.appendChild(this.mainStrip);

        // expand/collapse component
        this.titlePanel = CustomSerial.newElement('div', 'customSerialTitlePanel', 'title-panel-collapsed horizontal-panel');
        this.mainStrip.appendChild(this.titlePanel);

        this.expandCollapseButton = CustomSerial.newElement('button', 'customMidiExpandCollapseButton', 'expand-collapse-button collapsed');
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

        this.mainLabel = CustomSerial.newElement('div', 'CustomSerialMainLabel', 'custom-serial-label');
        this.mainLabel.innerHTML = "Micro:bit";
        this.titlePanel.appendChild(this.mainLabel);


        // Create a top level panel
        this.mainPanel = CustomSerial.newElement('div', 'customSerialMainPanel', 'custom-serial main-panel horizontal-panel');
        this.mainPanel.style.display = 'none';
        this.mainStrip.appendChild(this.mainPanel);

        // Toggle button to connect/disconnect to attached devices
        this.connectionPanel = CustomSerial.newElement('div', 'customSerialConnectionPanel', 'horizontal-panel custom-serial-panel');
        this.mainPanel.appendChild(this.connectionPanel);
        this.connectButton = CustomSerial.newElement('button', 'customSerialConnectButton', 'port-toggle toggled-off');
        this.connectButton.innerHTML = "USB";
        this.connectionPanel.appendChild(this.connectButton);
        
        this.connectBaudRate = CustomSerial.newElement('select', 'customSerialBaudRateSelect', 'custom-serial-select');
        this.connectBaudRate.innerHTML = `
        <option value="115200" selected="true">115200</option>
        <option value="31250">31250</option>
        <option value="9600">9600</option>
        `;
        this.connectionPanel.appendChild(this.connectBaudRate);
        this.connectButton.addEventListener('click', async () => {
            const baud = parseInt(this.connectBaudRate.value);
            if (!baud) { baud = 115200; console.warn(`Invalid baud rate ${this.connectBaudRate.value}. Defaulting to 115200`); }
            this.serial.connectBaudRate = baud;

            // turn on or off the USB serial connection
            await this.serial.toggleUSBConnection();
            
            // update the buttons to match the connected state
            if (this.serial.IsUSBConnected()) { 
                // look for an attached microbit
                this.connectButton.innerHTML = "Disconnect";
                this.connectButton.classList.remove('toggled-off');
                this.connectButton.classList.add('toggled-on');
                this.btConnectButton.classList.add('disabled');
            } else {
                // disconnect
                this.connectButton.innerHTML = "USB";
                this.connectButton.classList.remove('toggled-on');
                this.connectButton.classList.add('toggled-off');
                this.btConnectButton.classList.remove('disabled');
            }
        });

        // ---------- Bluetooth connection ----------- //
        
        // Toggle button to connect/disconnect to paired devices
        this.btConnectionPanel = CustomSerial.newElement('div', 'customSerialBTConnectionPanel', 'horizontal-panel custom-serial-panel');
        this.mainPanel.appendChild(this.btConnectionPanel);
        this.btConnectButton = CustomSerial.newElement('button', 'customSerialBTConnectButton', 'port-toggle toggled-off');
        this.btConnectButton.innerHTML = "Bluetooth";
        this.btConnectionPanel.appendChild(this.btConnectButton);
        
        this.btConnectButton.addEventListener('click', async () => {
            await this.serial.toggleBluetoothConnection();
            if (this.serial.IsBluetoothConnected()) {
                // Successfully connected to Bluetooth, so change status of button
                this.btConnectButton.innerHTML = "Disconnect";
                this.btConnectButton.classList.remove('toggled-off');
                this.btConnectButton.classList.add('toggled-on');
                this.connectionPanel.setAttribute('style', 'display: none;');
            } else {
                this.connectionPanel.setAttribute('style', 'display: flex;');
                this.btConnectButton.innerHTML = "Bluetooth";
                this.btConnectButton.classList.remove('toggled-on');
                this.btConnectButton.classList.add('toggled-off');
            }
        });
               
        
        /* -------- simulator connect button -------- */
        this.simConnectionPanel = CustomSerial.newElement('div', 'customSerialSimConnectionPanel', 'horizontal-panel custom-serial-panel');
        this.mainPanel.appendChild(this.simConnectionPanel);
        this.simConnectButton = CustomSerial.newElement('button', 'customSerialSimConnectButton', 'port-toggle toggled-off');
        this.simConnectButton.innerHTML = "Sim";
        this.simConnectionPanel.appendChild(this.simConnectButton);


        this.simConnectButton.addEventListener('click', async () => {
            const baud = parseInt(this.connectBaudRate.value);
            if (!baud) { baud = 115200; console.warn(`Invalid baud rate ${this.connectBaudRate.value}. Defaulting to 115200`); }
            this.serial.connectBaudRate = baud;

            // turn on or off the USB serial connection
            await this.serial.toggleSimConnection();
            
            // update the buttons to match the connected state
            if (this.serial.IsSimConnected()) { 
                // look for an attached microbit
                this.simConnectButton.innerHTML = "Disconnect";
                this.simConnectButton.classList.remove('toggled-off');
                this.simConnectButton.classList.add('toggled-on');
            } else {
                // disconnect
                this.simConnectButton.innerHTML = "Sim";
                this.simConnectButton.classList.remove('toggled-on');
                this.simConnectButton.classList.add('toggled-off');
            }
        });

        /* ------------------------------------------------------------ */


        // button and text box for sending arbitrary strings to the attached device
        this.sendPanel = CustomSerial.newElement('div', 'customSerialSendPanel', 'vertical-panel custom-serial-panel');
        this.mainPanel.appendChild(this.sendPanel);
              
        this.sendSerialSubPanel = CustomSerial.newElement('div', 'customSerialSendSubPanel', 'horizontal-panel', 'custom-serial-panel');
        this.sendPanel.appendChild(this.sendSerialSubPanel);

        this.sendSerialButton = CustomSerial.newElement('button', 'customSerialSendButton', 'serial-send-button');
        this.sendSerialButton.innerHTML = "Send";
        this.sendSerialSubPanel.appendChild(this.sendSerialButton);
        
        this.sendSerialTextBox = CustomSerial.newElement('input', 'customSerialSendTextBox', 'serial-send-textbox');
        this.sendSerialTextBox.type = 'text';
        this.sendSerialTextBox.value = 'Hello';
        this.sendSerialSubPanel.appendChild(this.sendSerialTextBox);

        this.sendSerialButton.addEventListener('click', (event) => {
            this.serial.writeLine(this.sendSerialTextBox.value)
        });

        this.sendSerialTextBox.addEventListener('change', (event) => {
            this.serial.writeLine(this.sendSerialTextBox.value)
        }) 

        // Text area for receiving serial data, and button for forwarding to MIDI
        this.receivePanel = CustomSerial.newElement('div', 'customSerialReceivePanel', 'horizontal-panel custom-serial-panel');
        this.mainPanel.appendChild(this.receivePanel);

        this.serialReadoutElement = CustomSerial.newElement('div', 'customSerialReadout', 'custom-serial-readout');
        this.receivePanel.appendChild(this.serialReadoutElement);
    }

    showMessage(message) {
        this.serialReadoutElement.textContent = message.trim()
    }

}

customElements.define('custom-serial', CustomSerial);
