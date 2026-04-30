import * as path from 'path';
import { readFile } from 'fs/promises';
import * as handlebars from 'handlebars';

let helpersRegistered = false;

export const compileTemplate = async (templateName: string, context: any) => {
  if (!helpersRegistered) {
    handlebars.registerHelper('eq', (left: unknown, right: unknown) => left === right);
    helpersRegistered = true;
  }
  const templatePath = path.resolve(__dirname, 'templates', `${templateName}.hbs`);
  const templateContent = await readFile(templatePath, 'utf8');
  const template = handlebars.compile(templateContent);
  return template(context);
};
