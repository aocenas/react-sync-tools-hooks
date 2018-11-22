import React = require('react')
import { buttonStyle } from './style'
import { todosModel, Todos } from './todosModel'
import { useModel } from '../../src'
const { useCallback } = React

interface Props {
  todoId: number | string
}

export const TodoItem = ({ todoId }: Props) => {
  const [
    todo,
    { updateTodoText, deleteTodo, undoTodo, completeTodo },
  ] = useModel(
    todosModel,
    useCallback((state: Todos) => state[todoId], [todoId]),
  )

  if (!todo) {
    return null
  }

  return (
    <div
      style={{
        border: 'solid 1px lightgray',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        marginBottom: 5,
      }}
    >
      <div
        contentEditable={true}
        suppressContentEditableWarning={true}
        style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
        onBlur={(e) => updateTodoText(todo.id, e.currentTarget.innerHTML)}
      >
        {todo.text}
      </div>
      <div>
        {todo.completed ? (
          <button style={buttonStyle} onClick={() => undoTodo(todo.id)}>
            undo
          </button>
        ) : (
          <button style={buttonStyle} onClick={() => completeTodo(todo.id)}>
            done
          </button>
        )}
        <button
          style={{ ...buttonStyle, background: 'transparent', color: 'gray' }}
          onClick={() => deleteTodo(todo.id)}
        >
          delete
        </button>
      </div>
    </div>
  )
}
