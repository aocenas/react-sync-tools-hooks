import React, { useState, useEffect } from 'react'
import { keyBy } from 'lodash'

import { todosModel } from './todosModel'
import { TodoItem } from './TodoItem'
import { buttonStyle } from './style'
import * as TodosClient from './todosClient'
import { useAction, useModel } from '../../src'

export const TodoApp = () => {
  const [text, setText] = useState('')
  const [todos, todosActions] = useModel(todosModel)

  const loadTodos = useAction(TodosClient.getTodos, (response: any) => {
    todosActions.setState(keyBy(response.data, 'id'))
  })
  useEffect(loadTodos.run, [])

  const addTodo: any = useAction(TodosClient.addTodo, (response: any) => {
    todosActions.addTodo(response.data.id, response.data.text)
    setText('')
  })

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <div>
        <input
          style={{
            marginRight: 10,
            padding: 10,
            borderRadius: 4,
            borderStyle: 'solid',
            borderWidth: 1,
            borderColor: 'lightgray',
          }}
          type={'text'}
          placeholder={'What do you need to do'}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          disabled={addTodo.isLoading}
        />
        <button
          disabled={!text || addTodo.isLoading}
          style={buttonStyle}
          onClick={() => {
            addTodo.run(text)
          }}
        >
          {addTodo.isLoading ? 'Adding...' : 'Add'}
        </button>
      </div>
      {addTodo.error && (
        <div
          style={{
            backgroundColor: 'orangered',
            color: 'white',
            padding: 5,
            margin: '10px 0',
          }}
        >
          {addTodo.error.message}
        </div>
      )}
      <div
        style={{
          color: 'gray',
          fontSize: 12,
          textTransform: 'uppercase',
          margin: '10px 0',
        }}
      >
        {Object.keys(todos).length} todos
      </div>
      {Object.keys(todos).map((key: string) => (
        <TodoItem key={key} todoId={key} />
      ))}
    </div>
  )
}
