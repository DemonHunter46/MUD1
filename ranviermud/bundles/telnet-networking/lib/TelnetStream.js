'use strict';

const { Sequences, Options } = require('ranvier-telnet');
const { TransportStream } = require('ranvier');

class TelnetStream extends TransportStream
{
  attach(socket) {
    super.attach(socket);

    this.gmcpEnabled = false;

    socket.on('data', message => {
      this.emit('data', message);
    });

    socket.on('error', err => {
      this.emit('error', err);
    });

    this.socket.on('DO', opt => {
      switch (opt) {
        case Options.OPT_GMCP:
          this.gmcpEnabled = true;
          this.emit('GMCP-READY');
          break;
        default:
          this.socket.telnetCommand(Sequences.WONT, opt);
          break;
      }
    });

    this.socket.on('DONT', opt => {
      if (opt === Options.OPT_GMCP) {
        this.gmcpEnabled = false;
      }
    });

    this.socket.on('GMCP', (gmcpPackage, data) => {
      this.emit('GMCP', gmcpPackage, data);
    });
  }

  get writable() {
    return this.socket.writable;
  }

  write(message, encoding = 'utf8') {
    if (!this.writable) {
      return;
    }

    this.socket.write(message, encoding);
  }

  /**
   * Send a GMCP message with correct IAC SB 201 [data] IAC SE framing.
   * ranvier-telnet's built-in sendGMCP omits the OPT_GMCP byte (201)
   * after SB, so we build the buffer ourselves here.
   */
  sendGMCP(gmcpPackage, data) {
    if (!this.writable || !this.gmcpEnabled) {
      return;
    }

    const gmcpData = gmcpPackage + ' ' + JSON.stringify(data);
    const dataBuffer = Buffer.from(gmcpData);

    // Correct sequence: IAC SB OPT_GMCP [data] IAC SE
    const header = Buffer.from([Sequences.IAC, Sequences.SB, Options.OPT_GMCP]);
    const footer = Buffer.from([Sequences.IAC, Sequences.SE]);

    this.socket.socket.write(
      Buffer.concat([header, dataBuffer, footer])
    );
  }

  pause() {
    this.socket.pause();
  }

  resume() {
    this.socket.resume();
  }

  end() {
    this.socket.end();
  }

  executeToggleEcho() {
    this.socket.toggleEcho();
  }
}

module.exports = TelnetStream;