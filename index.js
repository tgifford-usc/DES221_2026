// To communicate between this webpage and a microbit, we need an object of type 'Serial' that
// handles USB or bluetooth connections, and does the message sending. If you have included
// the tag <custom-serial> in your index.html, this creates one automatically. If not, then 
// you can create one manually. Note that if you make one manually, you will also need to 
// manually connect and disconnect to it using serial.toggleUSBConnection() or serial.toggleBluetoothConnection()
const customSerialComponent = document.querySelector('custom-serial');
const serial = (customSerialComponent) ? customSerialComponent.serial : new Serial();

// ---- Sending messages to microbit --- //
// To send a message to the microbit use this function
// serial.writeLine(message)


// --- Receiving messages from microbit --- //
// In order to receive messages from the microbit, replace console.log with your own handling code
// serial.customHandler = function(message) {
//      // do whatever you want with the message
//      console.log(message)
     
//      // If there is a custom-serial tag in the html document, then by default it has already
//      // defined this custom handler to display the message in a text box.  The code below
//      // replicates this behaviour.  
//      if (customSerialComponent) {
//           customSerialComponent.showMessage(message)     
//      }     
// }


// --- put any javascript you need for your interface below here --- //
