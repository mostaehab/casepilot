import { put, del } from "@vercel/blob";
import { caseRepository } from "../case/case.repository.js";
import { teamRepository } from "../team/team.repository.js";
import { caseFileRepository } from "./case-file.repository.js";

const canAccessCase = async (caseId: string, userId: string) => {
  const c = await caseRepository.findCaseById(caseId);
  if (!c) return { allowed: false, case: null };

  if (c.owner_id === userId) return { allowed: true, case: c };

  const assignment = await caseRepository.findAssignmentByCaseAndUser(
    caseId,
    userId,
  );
  if (assignment) return { allowed: true, case: c };

  if (c.team_id) {
    const member = await teamRepository.findMemberByTeamAndUser(
      c.team_id,
      userId,
    );
    if (member && member.status === "active")
      return { allowed: true, case: c };
  }

  return { allowed: false, case: c };
};

export const caseFileService = {
  uploadFile: async (
    caseId: string,
    file: Express.Multer.File,
    uploaderId: string,
  ) => {
    const { allowed, case: c } = await canAccessCase(caseId, uploaderId);
    if (!c) {
      throw new Error("Case not found");
    }
    if (!allowed) {
      throw new Error("You do not have access to this case");
    }

    const blob = await put(
      `cases/${caseId}/${Date.now()}-${file.originalname}`,
      file.buffer,
      {
        access: "public",
        contentType: file.mimetype,
      },
    );

    return await caseFileRepository.createFile({
      caseId,
      uploadedBy: uploaderId,
      fileName: file.originalname,
      fileUrl: blob.url,
      fileType: file.mimetype,
      fileSize: file.size,
    });
  },

  listFiles: async (caseId: string, requesterId: string) => {
    const { allowed, case: c } = await canAccessCase(caseId, requesterId);
    if (!c) {
      throw new Error("Case not found");
    }
    if (!allowed) {
      throw new Error("You do not have access to this case");
    }
    return await caseFileRepository.findFilesByCaseId(caseId);
  },

  deleteFile: async (fileId: string, requesterId: string) => {
    const file = await caseFileRepository.findFileById(fileId);
    if (!file) {
      throw new Error("File not found");
    }

    const c = await caseRepository.findCaseById(file.case_id);
    if (!c) {
      throw new Error("Case not found");
    }

    const isOwner = c.owner_id === requesterId;
    const isUploader = file.uploaded_by === requesterId;
    if (!isOwner && !isUploader) {
      throw new Error("Only the case owner or uploader can delete this file");
    }

    await del(file.file_url);
    await caseFileRepository.deleteFile(fileId);
  },

  // ---- Admin overrides ----

  adminDeleteFile: async (fileId: string) => {
    const file = await caseFileRepository.findFileById(fileId);
    if (!file) {
      throw new Error("File not found");
    }
    await del(file.file_url);
    await caseFileRepository.deleteFile(fileId);
  },
};
