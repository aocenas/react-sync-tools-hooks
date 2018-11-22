import { mount } from 'enzyme'
import * as React from 'react'

import { usePropsChangedToken } from './utils'

const setupComponent = () => {
  const Component = ((props: any) => {
    const token = usePropsChangedToken(props)
    return <div>{token.toString()}</div>
  }) as any

  // Hooks do not work with shallow rendering
  const wrapper = mount(<Component id={1} />)
  wrapper.render()
  return wrapper
}

describe('usePropsChangedToken', () => {
  it('Changes token with changes in props', () => {
    const wrapper = setupComponent()
    const token1 = wrapper.text()

    wrapper.setProps({ id: 1 })
    const token2 = wrapper.text()
    expect(token1).toBe(token2)

    wrapper.setProps({ id: 2 })
    const token3 = wrapper.text()
    expect(token3).not.toBe(token2)

    wrapper.setProps({ id: 2, a: 1 })
    const token4 = wrapper.text()
    expect(token4).not.toBe(token3)

    // setProps works like setState, merging the properties
    wrapper.setProps({ id: 2, a: undefined })
    const token5 = wrapper.text()
    expect(token5).not.toBe(token4)
  })

})
