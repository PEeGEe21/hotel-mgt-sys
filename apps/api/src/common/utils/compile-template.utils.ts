import * as path from 'path';
import { readFile } from 'fs/promises';
import * as handlebars from 'handlebars';

export const compileTemplate = async (templateName: string, context: any) => {
  const templatePath = path.resolve(__dirname, 'templates', `${templateName}.hbs`);
  const templateContent = await readFile(templatePath, 'utf8');
  const template = handlebars.compile(templateContent);
  return template(context);
};
