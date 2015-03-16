var React   = require('react/addons');
var Fluxxor = require('fluxxor');
var assign  = require('object-assign');

var constants = {
  TODO_CREATE:              "TODO_CREATE",
  TODO_COMPLETE:            "TODO_COMPLETE",
  TODO_DESTROY:             "TODO_DESTROY",
  TODO_DESTORY_COMPLETED:   "TODO_DESTORY_COMPLETED",
  TODO_TOGGLE_COMPLETE_ALL: "TODO_TOGGLE_COMPLETE_ALL",
  TODO_UNDO_COMPLETE:       "TODO_UNDO_COMPLETE",
  TODO_UPDATE_TEXT:         "TODO_UPDATE_TEXT"
};

var actions = {
  create: function(text) {
    this.dispatch(constants.TODO_CREATE, { text: text });
  },

  updateText: function(id, text) {
    this.dispatch(constants.TODO_UPDATE_TEXT, { id: id, text: text });
  },

  toggleComplete: function(todo) {
    var id = todo.id;
    if (todo.complete) {
      this.dispatch(constants.TODO_UNDO_COMPLETE, { id: id });
    } else {
      this.dispatch(constants.TODO_COMPLETE, {id: id});
    }
  },

  toggleCompleteAll: function() {
    this.dispatch(constants.TODO_TOGGLE_COMPLETE_ALL);
  },

  destroy: function(id) {
    this.dispatch(constants.TODO_DESTROY, {id: id});
  },

  destroyCompleted: function() {
    this.dispatch(constants.TODO_DESTORY_COMPLETED);
  },
};

var TodoStore = Fluxxor.createStore({
  initialize: function() {
    this.todos = {};

    this.bindActions(
      "TODO_CREATE",              this.create,
      "TODO_DESTROY",             this.destroy,
      "TODO_UPDATE_TEXT",         this.updateText,
      "TODO_COMPLETE",            this.complete,
      "TODO_UNDO_COMPLETE",       this.undoComplete,
      "TODO_TOGGLE_COMPLETE_ALL", this.toggleCompleteAll,
      "TODO_DESTORY_COMPLETED",   this.destroyCompleted
    );
  },

  areAllComplete: function() {
    for (var id in this.todos) {
      if (!this.todos[id].complete) {
        return false;
      }
    }
    return true;
  },

  create: function(payload) {
    var text = payload.text.trim();
    if (text !== ''){
      var id = (+new Date() + Math.floor(Math.random() * 999999)).toString(36);
      this.todos[id] = {
        id:  id,
        complete: false,
        text: text
      };
    }
    this.emit('change');
  },

  destroy: function(payload) {
    this._destory(payload.id);
    this.emit('change');
  },

  updateText: function(payload) {
    var text = payload.text.trim();
    if (text !== '') {
      this._update(payload.id, {text: text});
    }
    this.emit('change');
  },

  complete: function(payload) {
    this._update(payload.id, {complete: true});
    this.emit('change');
  },

  undoComplete: function(payload) {
    this._update(payload.id, {complete: false});
    this.emit('change');
  },

  toggleCompleteAll: function(payload) {
    if (this.areAllComplete()){
      this._updateAll({ complete: false });
    } else {
      this._updateAll({ complete: true });
    }
    this.emit('change');
  },

  destroyCompleted: function() {
    for (var id in this.todos) {
      if (this.todos[id].complete) {
        this._destory(id);
      }
    }
    this.emit('change');
  },

  _update: function(id, updates) {
    this.todos[id] = assign({}, this.todos[id], updates);
  },
  
  _updateAll: function(updates) {
    for (var id in this.todos) {
      this._update(id, updates);
    }
  },

  _destory: function(id) {
    delete this.todos[id];
  },

  getState: function() {
    return {
      allTodos: this.todos,
      areAllComplete: this.areAllComplete()
    };
  }
});

var FluxMixin = Fluxxor.FluxMixin(React),
    StoreWatchMixin = Fluxxor.StoreWatchMixin;

var TodoApp = React.createClass({
  mixins: [ FluxMixin, StoreWatchMixin('TodoStore') ],
  getInitialState: function() {
    return {};
  },
  getStateFromFlux: function() {
    return this.getFlux().store('TodoStore').getState();
  },
  render: function() {
    return (
      <div>
        <Header />
        <MainSection
           allTodos={this.state.allTodos}
           areAllComplete={this.state.areAllComplete}
           />
        <Footer allTodos={this.state.allTodos}/>
      </div>
    );
  }
});

var Header = React.createClass({
  mixins: [ FluxMixin ],

  render: function() {
    return (
      <header id="header">
        <h1>todos</h1>
        <TodoTextInput
           id="new-todo"
           placeholder="What needs to be done?"
           onSave={this._onSave}
           />
      </header>
    );
  },

  _onSave: function(text) {
    if (text.trim()) {
      this.getFlux().actions.create(text);
    }
  }
});

var Footer = React.createClass({
  mixins: [ FluxMixin ],

  propTypes: {
    allTodos: React.PropTypes.object.isRequired
  },

  render: function() {
    var allTodos = this.props.allTodos;
    var total = Object.keys(allTodos).length;

    if (total === 0) {
      return null;
    }

    var completed = 0;
    for (var key in allTodos) {
      if (allTodos[key].complete) {
        completed++;
      }
    }

    var itemsLeft = total - completed;
    var itemsLeftPhrase = itemsLeft === 1 ? 'item ' : 'items ';
    itemsLeftPhrase += 'left';

    var clearCompletedButton;
    if (completed) {
      clearCompletedButton = 
        <button
          id="clear-completed"
          onClick={this._onClearCompletedClick}>
          Clear completed ({completed})
        </button>;
    }

    return (
      <footer id="footer">
        <span id="todo-count">
          <strong>{itemsLeft}</strong>
          {itemsLeftPhrase}
        </span>
        {clearCompletedButton}
      </footer>
    );
  },

  _onClearCompletedClick: function() {
    this.getFlux().actions.destroyCompleted();
  }
});

var MainSection = React.createClass({
  mixins: [ FluxMixin ],

  propTypes: {
    allTodos:       React.PropTypes.object.isRequired,
    areAllComplete: React.PropTypes.bool.isRequired
  },

  render: function() {
    if (Object.keys(this.props.allTodos).length < 1) {
      return null;
    }

    var allTodos = this.props.allTodos;
    var todos = [];

    for (var key in allTodos) {
      todos.push(<TodoItem key={key} todo={allTodos[key]} />);
    }

    return (
      <section id="main">
        <input
          id="toggle-all"
          type="checkbox"
          onChange={this._onToggleCompleteAll}
          checked={this.props.areAllComplete ? 'checked' : ''}
        />
        <label htmlFor="toggle-all">Mark all as complete</label>
        <ul id="todo-list">{todos}</ul>
      </section>
    );
  },

  _onToggleCompleteAll: function() {
    this.getFlux().actions.toggleCompleteAll();
  }
});

var TodoTextInput = React.createClass({
  propTypes: {
    className:   React.PropTypes.string,
    id:          React.PropTypes.string,
    placeholder: React.PropTypes.string,
    onSave:      React.PropTypes.func.isRequired,
    value:       React.PropTypes.string
  },

  getInitialState: function() {
    return {
      value: this.props.value || ''
    };
  },

  render: function() {
    return (
      <input
        className={this.props.className}
        id={this.props.id}
        placeholder={this.props.placeholder}
        onBlur={this._save}
        onChange={this._onChange}
        onKeyDown={this._onKeyDown}
        value={this.state.value}
        autoFocus={true}
           />
    );
  },

  _save: function() {
    this.props.onSave(this.state.value);
    this.setState({
      value: ''
    });
  },

  _onChange: function(e) {
    this.setState({
      value: e.target.value
    });
  },

  _onKeyDown: function(e) {
    // 13 == Enter Key Code
    if (e.keyCode === 13) {
      this._save();
    }
  }
});

var TodoItem = React.createClass({
  mixins: [ FluxMixin ],

  propTypes: {
    todo: React.PropTypes.object.isRequired
  },

  getInitialState: function() {
    return {
      isEditing: false
    };
  },

  render: function() {
    var todo = this.props.todo;

    var input;
    if (this.state.isEditing) {
      input =
        <TodoTextInput className="edit" onSave={this._onSave} value={todo.text} />;
    }

    var cx = React.addons.classSet;

    return (
      <li className={cx({
         'completed': todo.complete,
         'editing': this.state.isEditing
          })}
          key={todo.id}>
        <div className="view">
          <input
            className="toggle"
            type="checkbox"
            checked={todo.complete}
            onChange={this._onToggleComplete}
            />
          <label onDoubleClick={this._onDoubleClick}>
            {todo.text}
          </label>
          <button className="destroy" onClick={this._onDestroyClick} />
        </div>
        {input}
      </li>
    );
  },

  _onToggleComplete: function() {
    this.getFlux().actions.toggleComplete(this.props.todo);
  },

  _onDoubleClick: function() {
    this.setState({ isEditing: true });
  },

  _onSave: function(text) {
    this.getFlux().actions.updateText(this.props.todo.id, text);
    this.setState({ isEditing: false });
  },

  _onDestroyClick: function() {
    this.getFlux().actions.destroy(this.props.todo.id);
  }
});

var stores = {
  TodoStore: new TodoStore(),
};
var flux = new Fluxxor.Flux(stores, actions);

React.render(
  <TodoApp flux={flux} />,
  document.getElementById('todoapp')
);
