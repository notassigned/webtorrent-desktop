const React = require('react')
const TextField = require('material-ui/TextField').default

const ModalOKCancel = require('./modal-ok-cancel')
const { dispatch, dispatcher } = require('../lib/dispatcher')


module.exports = class OpenMultiplayerSettingsModal extends React.Component {
  render () {
    return (
      <div className='open-multiplayer-settings-modal'>
        <p><label>Torrent2gether</label></p>
        <p><label>Enter a user name</label></p>
        <div>
          <TextField
            id='name-field'
            className='control'
            ref={(c) => { this.username = c }}
            fullWidth
          />
        </div>
        <p><label>Enter a room name</label></p>
        <div>
          <TextField
            id='roomId-field'
            className='control'
            ref={(c) => { this.roomId = c }}
            fullWidth
            onKeyDown={handleKeyDown.bind(this)}
          />
        </div>
        <ModalOKCancel
          cancelText='CANCEL'
          onCancel={dispatcher('exitModal')}
          okText='OK'
          onOK={handleOK.bind(this)}
        />
      </div>
    )
  }

  componentDidMount () {

  }
}

function handleKeyDown (e) {
  if (e.which === 13) handleOK.call(this) /* hit Enter to submit */
}

function handleOK () {
  dispatch('exitModal')
  dispatch('joinMultiplayerRoom', this.username.input.value, this.roomId.input.value)
}
