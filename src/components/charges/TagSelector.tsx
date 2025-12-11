import { useState } from 'react';
import Select, { MultiValue, StylesConfig } from 'react-select';
import { Tag } from 'lucide-react';
import { motion } from 'framer-motion';

interface TagOption {
  id: string;
  name: string;
  color?: string;
}

interface TagSelectorProps {
  availableTags: TagOption[];
  selectedTags?: string[];
  onTagSelect: (tagId: string) => void;
}

// AIDEV-NOTE: Implementação com react-select para resolver problemas de interação
// Substitui o componente Popover problemático por uma solução robusta e testada
interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

const TagSelector = ({ availableTags, selectedTags = [], onTagSelect }: TagSelectorProps) => {
  // Converter TagOption para formato do react-select
  const selectOptions: SelectOption[] = availableTags.map(tag => ({
    value: tag.id,
    label: tag.name,
    color: tag.color
  }));

  // Valores selecionados no formato do react-select
  const selectedValues = selectOptions.filter(option => 
    selectedTags.includes(option.value)
  );

  // AIDEV-NOTE: Estilos premium com animações e gradientes para experiência visual superior
  const customStyles: StylesConfig<SelectOption, true> = {
    control: (base, state) => ({
      ...base,
      minHeight: '42px',
      borderColor: state.isFocused ? '#3b82f6' : '#e5e7eb',
      borderWidth: '2px',
      borderRadius: '12px',
      boxShadow: state.isFocused 
        ? '0 0 0 3px rgba(59, 130, 246, 0.1), 0 4px 12px rgba(0, 0, 0, 0.05)' 
        : '0 2px 4px rgba(0, 0, 0, 0.02)',
      background: state.isFocused 
        ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
        : '#ffffff',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        borderColor: '#6366f1',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
      }
    }),
    multiValue: (base, { data }) => ({
      ...base,
      background: `linear-gradient(135deg, ${data.color}15 0%, ${data.color}25 100%)`,
      border: `1px solid ${data.color}40`,
      borderRadius: '8px',
      padding: '2px 6px',
      margin: '2px',
      transition: 'all 0.2s ease',
      '&:hover': {
        transform: 'scale(1.05)',
        boxShadow: `0 2px 8px ${data.color}30`
      }
    }),
    multiValueLabel: (base, { data }) => ({
      ...base,
      fontSize: '13px',
      fontWeight: '600',
      color: data.color,
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
    }),
    multiValueRemove: (base, { data }) => ({
      ...base,
      borderRadius: '6px',
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: '#ef4444',
        color: 'white',
        transform: 'scale(1.1)'
      }
    }),
    placeholder: (base) => ({
      ...base,
      fontSize: '14px',
      color: '#9ca3af',
      fontWeight: '500'
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
      zIndex: 10000,
      pointerEvents: 'auto'
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 10000
    }),
    option: (base, { data, isFocused, isSelected }) => ({
      ...base,
      backgroundColor: isSelected 
        ? `${data.color}20` 
        : isFocused 
        ? `${data.color}10` 
        : 'transparent',
      color: isSelected ? data.color : '#374151',
      fontWeight: isSelected ? '600' : '500',
      padding: '12px 16px',
      borderLeft: isSelected ? `4px solid ${data.color}` : '4px solid transparent',
      transition: 'none',
      '&:hover': {
        backgroundColor: `${data.color}15`
      }
    })
  };

  const handleChange = (newValue: MultiValue<SelectOption>) => {
    // Identificar qual tag foi adicionada ou removida
    const newValues = Array.from(newValue);
    const currentValues = selectedValues;
    
    // Encontrar a diferença
    const added = newValues.find(val => !currentValues.some(curr => curr.value === val.value));
    const removed = currentValues.find(curr => !newValues.some(val => val.value === curr.value));
    
    if (added) {
      console.log('Tag adicionada:', added.value);
      onTagSelect(added.value);
    } else if (removed) {
      console.log('Tag removida:', removed.value);
      onTagSelect(removed.value);
    }
  };

  return (
    <motion.div 
      className="flex items-center gap-3 p-2 rounded-xl bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-100"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.div
        whileHover={{ rotate: 15, scale: 1.1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Tag className="h-5 w-5 text-indigo-500" />
      </motion.div>
      
      <motion.div 
        className="flex-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <Select<SelectOption, true>
          isMulti
          options={selectOptions}
          value={selectedValues}
          onChange={handleChange}
          placeholder=" Selecionar tags"
          closeMenuOnSelect={false}
          styles={customStyles}
          className="min-w-[250px] text-sm"
          classNamePrefix="react-select"
          noOptionsMessage={() => "🔍 Nenhuma tag encontrada"}
          isSearchable
          isClearable={false}
          menuPortalTarget={document.body}
          menuPosition="absolute"
          menuPlacement="bottom"
        />
      </motion.div>
    </motion.div>
  );
};

export { TagSelector };
export default TagSelector;
