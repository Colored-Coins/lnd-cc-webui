module.exports = error =>
  $(`<div class="modal fade">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span></button>
          <h4 class="modal-title">Oops! Something went wrong</h4>
        </div>
        <div class="modal-body">
          <p>Lightning is still an experimental technology at its early stages,
             and errors still do happen. Sorry about that!</p>
          <p>Would  you like to:</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-default" data-dismiss="modal">Close dialog</button>
          <a href="/" class="btn btn-primary">Try a new wallet</a>
        </div>
      </div>
    </div>
  </div>`)

  .modal()
