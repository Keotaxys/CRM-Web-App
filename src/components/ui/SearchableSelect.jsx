import { forwardRef } from 'react';
import CustomSelect from './CustomSelect';

const SearchableSelect = forwardRef(function SearchableSelect(props, ref) {
  return <CustomSelect {...props} ref={ref} searchable />;
});

export default SearchableSelect;
