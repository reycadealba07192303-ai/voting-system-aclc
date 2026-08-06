import { Vote } from 'lucide-react'
import Badge from './Badge'
import SelectDropdown from './SelectDropdown'

/** Election picker built on SelectDropdown. */
export default function ElectionSelect({
  elections = [],
  value = '',
  onChange,
  placeholder = 'Select election…',
}) {
  const options = elections.map((el) => ({
    value: el._id,
    label: el.title,
    right: el.status ? <Badge label={el.status} variant={el.status} /> : null,
  }))

  return (
    <SelectDropdown
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      icon={Vote}
      minWidth={240}
      emptyLabel="No elections found"
    />
  )
}
