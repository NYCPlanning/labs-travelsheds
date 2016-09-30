
var CutoffChooser = React.createClass({
  getInitialState() {
    return({
      cutoffs: [15, 30, 45]
    })
  },

  delete: function(i) {
    this.state.cutoffs.splice(i,1)
    this.updateCutoffs()
 
  },

  handleChange: function(i,e) {
    this.state.cutoffs[i] = parseInt(e.target.value)
    this.updateCutoffs()
  
  },

  addCutoff: function() {
    this.state.cutoffs.push(null)
    this.updateCutoffs()
  },

  updateCutoffs: function() {
    this.setState({
      cutoffs: this.state.cutoffs
    })

    window.cutoffs=this.state.cutoffs

  },

  componentDidMount() {
    window.cutoffs=this.state.cutoffs
  },

  render: function(){
    var self=this;

    return(
      <div >
        <h4>Time Cutoffs <span className="h4-mini">(minutes)</span></h4>
          {
            this.state.cutoffs.map(function(cutoff,i) {  
              var button = (i == self.state.cutoffs.length-1) ?
                <button className="btn btn-success" type="button" onClick={self.addCutoff}>✚</button> :
                <button className="btn btn-danger" type="button" onClick={self.delete.bind(self, i)}>✖</button> 

              return(
                <div key={self.state.cutoffs.length + '_' + i} className="input-group cutoff-row">
                  <input 
                    type="text" 
                    width={10} 
                    defaultValue={cutoff} 
                    className="form-control" 
                    placeholder="minutes"
                    onChange={self.handleChange.bind(self, i)}
                  /> 
                  <span className="input-group-btn">
                    {button}
                  </span>
                </div>
              ) 
            })
          }
      </div>
    )
  }
})
   
ReactDOM.render(
  <CutoffChooser/>,
  document.getElementById('form')
)
