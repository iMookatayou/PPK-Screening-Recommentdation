'use client'
import { default as ReactSelect } from 'react-select'
import type { Props as SelectProps } from 'react-select'

function ClientOnlySelect<OptionType, IsMulti extends boolean = false>(
  props: SelectProps<OptionType, IsMulti>
) {
  return <ReactSelect {...props} />
}

export default ClientOnlySelect
