const fs = require('fs');
const path = 'src/context/ModelContext.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'localStorage.setItem("omnimodel_selected_models_v4", JSON.stringify(selectedModels));',
  'localStorage.setItem("omnimodel_selected_models_v14", JSON.stringify(selectedModels));'
);

fs.writeFileSync(path, code);
console.log("Context saved successfully.");
