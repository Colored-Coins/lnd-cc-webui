module.exports = error => {
  let title, message, buttons

  if (error === 'Service Unavailable') {
    title = 'Whoa, people are really liking this demo!'
    message = '<p>Unfortunately, we reached our maximum capacity of concurrent users - this won\'t be limited in the final release. Please try this demo again very soon!</p>'
    buttons = '<a href="#new" class="btn btn-primary">Try again</a>'
  } else {
    title = 'Oops! Something went wrong'
    message = `<p>Lightning is still an experimental technology at its early stages, as is this demo,
                  and errors still do happen. Sorry about that!</p>
               <p>Would  you like to:</p>`
    buttons = `<button type="button" class="btn btn-default" data-dismiss="modal">Close dialog</button>
               <a href="#new" class="btn btn-primary">Try a new wallet</a>`
  }
  $(`<div class="modal fade">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span></button>
          <h4 class="modal-title">${ title }</h4>
        </div>
        <div class="modal-body">${ message }</div>
        <div class="modal-footer">${ buttons }</div>
      </div>
    </div>
  </div>`)

  .modal()
  .on('click', 'a[href="#new"]', function(e) { $(e.delegateTarget).modal('hide') })
}
