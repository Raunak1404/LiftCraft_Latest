import { INPUT_RANGES } from '../constants';

export const validateInput = (name, value) => {
  const errors = {};
  const numValue = parseFloat(value);

  switch(name) {
    case 'CL_target':
      if (isNaN(numValue)) {
        errors[name] = 'Must be a number';
      } else if (numValue < INPUT_RANGES.CL_target.min || numValue > INPUT_RANGES.CL_target.max) {
        errors[name] = `Typically between ${INPUT_RANGES.CL_target.min} and ${INPUT_RANGES.CL_target.max}`;
      }
      break;
    case 'alpha':
      if (isNaN(numValue)) {
        errors[name] = 'Must be a number';
      } else if (numValue < INPUT_RANGES.alpha.min || numValue > INPUT_RANGES.alpha.max) {
        errors[name] = `Typically between ${INPUT_RANGES.alpha.min}° and ${INPUT_RANGES.alpha.max}°`;
      }
      break;
    case 'Re':
      if (isNaN(numValue)) {
        errors[name] = 'Must be a number';
      } else if (numValue < INPUT_RANGES.Re.min || numValue > INPUT_RANGES.Re.max) {
        errors[name] = `Typically ${INPUT_RANGES.Re.min.toExponential(0)} to ${INPUT_RANGES.Re.max.toExponential(0)}`;
      }
      break;
    case 'Cm_target':
      if (value && isNaN(numValue)) {
        errors[name] = 'Must be a number';
      } else if (value && (numValue < INPUT_RANGES.Cm_target.min || numValue > INPUT_RANGES.Cm_target.max)) {
        errors[name] = `Typically between ${INPUT_RANGES.Cm_target.min} and ${INPUT_RANGES.Cm_target.max}`;
      }
      break;
    case 'mach':
      if (isNaN(numValue)) {
        errors[name] = 'Must be a number';
      } else if (numValue < INPUT_RANGES.mach.min || numValue > INPUT_RANGES.mach.max) {
        errors[name] = `Must be between ${INPUT_RANGES.mach.min} and ${INPUT_RANGES.mach.max}`;
      }
      break;
  }

  return errors;
};

export const validateAllInputs = (inputs) => {
  const requiredFields = ['CL_target', 'alpha', 'Re'];
  return requiredFields.every(key => {
    const errors = validateInput(key, inputs[key]);
    return Object.keys(errors).length === 0;
  });
};
