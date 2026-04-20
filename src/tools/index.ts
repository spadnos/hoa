import { listProjectsTool, listProjects, ListProjectsInput } from './list-projects';
import { getProjectTool, getProject, GetProjectInput } from './get-project';
import { createProjectTool, createProject, CreateProjectInput } from './create-project';
import { updateProjectTool, updateProject, UpdateProjectInput } from './update-project';
import { listDocumentsTool, listDocuments } from './list-documents';
import { getDocumentTool, getDocument, GetDocumentInput } from './get-document';
import { getContactsTool, getContacts } from './get-contacts';
import { addContactTool, addContact, AddContactInput } from './add-contact';
import { editContactTool, editContact, EditContactInput } from './edit-contact';
import { removeContactTool, removeContact, RemoveContactInput } from './remove-contact';
import { getFeeLedgerTool, getFeeLedger } from './fee-ledger';
import { getDeadlinesTool, getDeadlines, GetDeadlinesInput } from './get-deadlines';
import { addConditionTool, addCondition, AddConditionInput } from './add-condition';
import { updateConditionTool, updateCondition, UpdateConditionInput } from './update-condition';
import { listConditionsTool, listConditions, ListConditionsInput } from './list-conditions';
import { logInspectionTool, logInspection, LogInspectionInput } from './log-inspection';
import { listInspectionsTool, listInspections, ListInspectionsInput } from './list-inspections';
import {
  addProjectDocumentTool,
  addProjectDocument,
  AddProjectDocumentInput,
} from './add-project-document';
import {
  listProjectDocumentsTool,
  listProjectDocuments,
  ListProjectDocumentsInput,
} from './list-project-documents';
import { getMembersTool, getMembers, GetMembersInput } from './get-members';
import { addMemberTool, addMember, AddMemberInput } from './add-member';
import { editMemberTool, editMember, EditMemberInput } from './edit-member';
import { removeMemberTool, removeMember, RemoveMemberInput } from './remove-member';
import { listApprovalTypesTool, listApprovalTypes } from './list-approval-types';
import {
  listProjectApprovalsTool,
  listProjectApprovals,
  ListProjectApprovalsInput,
} from './list-project-approvals';
import {
  setProjectApprovalTool,
  setProjectApproval,
  SetProjectApprovalInput,
} from './set-project-approval';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import path from 'path';
import { getDb } from '../db';

export function getHomeownerTools(): Tool[] {
  return [getDocumentTool, createProjectTool];
}

export function getTools(): Tool[] {
  return [
    listProjectsTool,
    getProjectTool,
    createProjectTool,
    updateProjectTool,
    listDocumentsTool,
    getDocumentTool,
    getContactsTool,
    addContactTool,
    editContactTool,
    removeContactTool,
    getFeeLedgerTool,
    getDeadlinesTool,
    addConditionTool,
    updateConditionTool,
    listConditionsTool,
    logInspectionTool,
    listInspectionsTool,
    addProjectDocumentTool,
    listProjectDocumentsTool,
    getMembersTool,
    addMemberTool,
    editMemberTool,
    removeMemberTool,
    listApprovalTypesTool,
    listProjectApprovalsTool,
    setProjectApprovalTool,
  ];
}

function documentsDir(): string {
  return process.env.DOCUMENTS_DIR ?? path.join(process.cwd(), 'documents');
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  orgId: string
): Promise<unknown> {
  const db = getDb();

  switch (name) {
    case 'list_projects':
      return listProjects(input as ListProjectsInput, db, orgId);
    case 'get_project':
      return getProject(input as unknown as GetProjectInput, db, orgId);
    case 'create_project':
      return createProject(input as unknown as CreateProjectInput, db, orgId);
    case 'update_project':
      return updateProject(input as unknown as UpdateProjectInput, db, orgId);
    case 'list_documents':
      return listDocuments(documentsDir());
    case 'get_document':
      return getDocument(input as unknown as GetDocumentInput, documentsDir());
    case 'get_contacts':
      return getContacts(db, orgId);
    case 'add_contact':
      return addContact(input as unknown as AddContactInput, db, orgId);
    case 'edit_contact':
      return editContact(input as unknown as EditContactInput, db, orgId);
    case 'remove_contact':
      return removeContact(input as unknown as RemoveContactInput, db, orgId);
    case 'get_fee_ledger':
      return getFeeLedger(db, orgId);
    case 'get_deadlines':
      return getDeadlines(input as unknown as GetDeadlinesInput, db, orgId);
    case 'add_condition':
      return addCondition(input as unknown as AddConditionInput, db, orgId);
    case 'update_condition':
      return updateCondition(input as unknown as UpdateConditionInput, db, orgId);
    case 'list_conditions':
      return listConditions(input as unknown as ListConditionsInput, db, orgId);
    case 'log_inspection':
      return logInspection(input as unknown as LogInspectionInput, db, orgId);
    case 'list_inspections':
      return listInspections(input as unknown as ListInspectionsInput, db, orgId);
    case 'add_project_document':
      return addProjectDocument(input as unknown as AddProjectDocumentInput, db, orgId);
    case 'list_project_documents':
      return listProjectDocuments(input as unknown as ListProjectDocumentsInput, db, orgId);
    case 'get_members':
      return getMembers(input as unknown as GetMembersInput, db, orgId);
    case 'add_member':
      return addMember(input as unknown as AddMemberInput, db, orgId);
    case 'edit_member':
      return editMember(input as unknown as EditMemberInput, db, orgId);
    case 'remove_member':
      return removeMember(input as unknown as RemoveMemberInput, db, orgId);
    case 'list_approval_types':
      return listApprovalTypes(db, orgId);
    case 'list_project_approvals':
      return listProjectApprovals(input as unknown as ListProjectApprovalsInput, db, orgId);
    case 'set_project_approval':
      return setProjectApproval(input as unknown as SetProjectApprovalInput, db, orgId);
    default:
      return `Unknown tool: ${name}`;
  }
}
