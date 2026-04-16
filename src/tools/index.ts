import { listProjectsTool, listProjects, ListProjectsInput } from './list-projects';
import { getProjectTool, getProject, GetProjectInput } from './get-project';
import { createProjectTool, createProject, CreateProjectInput } from './create-project';
import { updateProjectTool, updateProject, UpdateProjectInput } from './update-project';
import { listDocumentsTool, listDocuments } from './list-documents';
import { getDocumentTool, getDocument, GetDocumentInput } from './get-document';
import { getContactsTool, getContacts } from './get-contacts';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import path from 'path';

export function getTools(): Tool[] {
  return [
    listProjectsTool,
    getProjectTool,
    createProjectTool,
    updateProjectTool,
    listDocumentsTool,
    getDocumentTool,
    getContactsTool,
  ];
}

function dirs(): { projectsDir: string; documentsDir: string; contactsDir: string } {
  return {
    projectsDir: process.env.PROJECTS_DIR ?? path.join(process.cwd(), 'projects'),
    documentsDir: process.env.DOCUMENTS_DIR ?? path.join(process.cwd(), 'documents'),
    contactsDir: process.env.CONTACTS_DIR ?? path.join(process.cwd(), 'contacts'),
  };
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  const { projectsDir, documentsDir, contactsDir } = dirs();

  switch (name) {
    case 'list_projects':
      return listProjects(input as ListProjectsInput, projectsDir);
    case 'get_project':
      return getProject(input as unknown as GetProjectInput, projectsDir);
    case 'create_project':
      return createProject(input as unknown as CreateProjectInput, projectsDir);
    case 'update_project':
      return updateProject(input as unknown as UpdateProjectInput, projectsDir);
    case 'list_documents':
      return listDocuments(documentsDir);
    case 'get_document':
      return getDocument(input as unknown as GetDocumentInput, documentsDir);
    case 'get_contacts':
      return getContacts(contactsDir);
    default:
      return `Unknown tool: ${name}`;
  }
}
