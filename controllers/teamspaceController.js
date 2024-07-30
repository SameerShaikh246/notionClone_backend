import accessModel from "../models/accessSchema.js";
import documentsModel from "../models/documentsModel.js";
import userModel from "../models/userModel.js";
import cloudinary from "../utils/cloudinary.js";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
export const createTeamspaceController = async (req, res) => {
  try {
    const { title, adminId, description } = req.body;
    console.log("create teamsace", title, adminId, description);
    if (!adminId) {
      return res.status(404).send({
        success: false,
        message: "User id not found",
      });
    }
    if (!title) {
      return res.status(404).send({
        success: false,
        message: "teamspace title not found",
      });
    }
    const teamspace = await new documentsModel({
      title,
      adminId,
      description,
      type: "teamspace",
    });

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      teamspace.icon = result.url;
      teamspace.cloudinary_id = result.public_id;
    }
    await teamspace.save();

    res.status(200).send({
      success: true,
      message: "Teamspace successfully created",
      data: teamspace,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "An error occurred while creating the teamspace",
    });
  }
};

export const defaultTeamspaceAccessController = async (req, res) => {
  try {
    const { id } = req.user;
    const { docId, access } = req.body;
    console.log("doc id and user id", docId, id);
    if (!docId || !access) {
      return res.status(400).send({
        success: false,
        message: "Missing docId or access in request body",
      });
    }
    const validAccessValues = ["fullAccess", "canEdit", "canView"];

    if (!validAccessValues.includes(access)) {
      return res
        .status(400)
        .send({ success: false, message: "Invalid access level" });
    }

    const teamspace = await documentsModel.findOne({
      _id: docId,
      type: "teamspace",
    });
    if (!teamspace) {
      return res
        .status(404)
        .send({ success: false, message: "Teamspace not found" });
    }
    if (!teamspace.adminId.equals(req.user.id)) {
      return res.status(404).send({
        success: false,
        message: "Only teamspace owner can change their access level.",
      });
    }

    const updatedTeamspace = await documentsModel.findOneAndUpdate(
      { _id: docId, adminId: req.user.id, type: "teamspace" },
      { $set: { defaultAccess: access } },
      { new: true }
    );
    if (!updatedTeamspace) {
      return res
        .status(404)
        .send({ success: false, message: "Failed to update teamspace access" });
    }

    res.status(200).send({
      success: true,
      message: "Teamspace access successfully updated",
      data: updatedTeamspace,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "An error occurred while updating teamspace access",
    });
  }
};

export const getTeamspaceController = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);

    const data = await documentsModel.find({
      adminId: req.user.id,
      type: "teamspace",
      isArchived: false,
      isPrivate: false,
    });
    // .populate({ path: "adminId" })
    // .select("-createdAt -updatedAt -__v ");

    const PagesWithFlag = data.map((page) => ({
      ...page.toObject(),
      isShared: false,
    }));

    // console.log("teamspace data: ", data);

    const sharedPages = await documentsModel.find({
      $or: [
        { "accessUsers.email": user.email },
        { "accessUsers.userId": user._id },
      ],
      isArchived: false,
    });
    // .populate({ path: "adminId" })
    // .select("-createdAt -updatedAt -__v ");
    // Add a flag to identify shared teamspace
    const sharedPagesWithFlag = sharedPages.map((page) => ({
      ...page.toObject(),
      isShared: true,
    }));
    res.status(200).send({
      success: true,
      message: "Teamspace list fetched successfully",
      data: [...PagesWithFlag, ...sharedPagesWithFlag],
    });

    /* Solving by using agregation method */

    // const teamspacePipeline = [
    //   {
    //     $match: {
    //       $or: [
    //         { adminId: req.user.id, type: "teamspace", isArchived: false },
    //         {
    //           $and: [
    //             {
    //               $or: [
    //                 { "accessUsers.email": user.email },
    //                 { "accessUsers.userId": user._id },
    //               ],
    //             },
    //             { type: "teamspace", isArchived: false },
    //           ],
    //         },
    //       ],
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "users", // Assuming the collection name is "users"
    //       localField: "adminId",
    //       foreignField: "_id",
    //       as: "admin",
    //     },
    //   },
    //   {
    //     $project: {
    //       _id: 1,
    //       title: 1,
    //       adminId: 1,
    //       isArchived: 1,
    //       page: 1,
    //       type: 1,
    //       favorites: 1,
    //       teamspaceId: 1,
    //       content: 1,
    //       description: 1,
    //       coverImage: 1,
    //       icon: 1,
    //       isPublished: 1,
    //       cloudinary_id: 1,
    //       defaultAccess: 1,
    //       // accessUsers: 1,
    //       admin: { $arrayElemAt: ["$admin", 0] },
    //       isShared: {
    //         $cond: {
    //           if: {
    //             $ne: [
    //               { $toObjectId: "$adminId" },
    //               new mongoose.Types.ObjectId(user._id),
    //             ],
    //           },
    //           then: true,
    //           else: false,
    //         },
    //       },
    //     },
    //   },
    // ];

    // const teamspaceData = await documentsModel.aggregate(teamspacePipeline);

    // res.status(200).send({
    //   success: true,
    //   message: "Teamspace list fetched successfully",
    //   data: teamspaceData,
    // });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "An error occurred while getting the teamspace list.",
    });
  }
};

export const getSingleTeamspaceWithMembersController = async (req, res) => {
  try {
    const adminId = req.user.id;
    const docId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid document ID provided",
      });
    }

    // const teamspace = await documentsModel.aggregate([
    //   {
    //     $match: {
    //       _id: new mongoose.Types.ObjectId(docId),
    //       adminId: new mongoose.Types.ObjectId(adminId),
    //     },
    //   },
    //   {
    //     $unwind: "$accessUsers", // Unwind the accessUsers array
    //   },
    //   {
    //     $lookup: {
    //       from: "users",
    //       localField: "accessUsers.email",
    //       foreignField: "email",
    //       as: "accessUsers.user",
    //     },
    //   },
    //   {
    //     $addFields: {
    //       "accessUsers.user": { $arrayElemAt: ["$accessUsers.user", 0] }, // Retrieve the user details from the array
    //     },
    //   },
    //   {
    //     $project: {
    //       "accessUsers.user.password": 0,
    //       "accessUsers.user.answer": 0,
    //       "accessUsers.user.createdAt": 0,
    //       "accessUsers.user.updatedAt": 0,
    //       "accessUsers.user.__v": 0,
    //       "accessUsers.user.theme": 0,
    //       "accessUsers.userId": 0,
    //       "accessUsers.email": 0,
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: "$_id",
    //       title: { $first: "$title" },
    //       isArchived: { $first: "$isArchived" },
    //       type: { $first: "$type" },
    //       favorites: { $first: "$favorites" },
    //       description: { $first: "$description" },
    //       createdAt: { $first: "$createdAt" },
    //       updatedAt: { $first: "$updatedAt" },
    //       icon: { $first: "$icon" },
    //       accessUsers: { $push: "$accessUsers" },
    //       adminId: { $first: "$adminId" },
    //       defaultAccess: { $first: "$defaultAccess" }, // Push the modified accessUsers array back
    //     },
    //   },
    // ]);

    const teamspace = await documentsModel.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(docId),
          adminId: new mongoose.Types.ObjectId(adminId),
        },
      },
      {
        $unwind: "$accessUsers",
      },
      {
        $lookup: {
          from: "users",
          localField: "accessUsers.email",
          foreignField: "email",
          as: "userDetails",
        },
      },
      {
        $addFields: {
          accessUsers: {
            $cond: {
              if: { $eq: ["$accessUsers.isGuest", false] },
              then: {
                $mergeObjects: [
                  "$accessUsers",
                  { $arrayElemAt: ["$userDetails", 0] },
                ],
              },
              // else:"$accessUsers"
              else: "$$REMOVE",
            },
          },
        },
      },
      {
        $project: {
          "accessUsers.password": 0,
          "accessUsers.answer": 0,
          "accessUsers.createdAt": 0,
          "accessUsers.updatedAt": 0,
          "accessUsers.__v": 0,
        },
      },
      {
        $group: {
          _id: "$_id",
          title: { $first: "$title" },
          isArchived: { $first: "$isArchived" },
          type: { $first: "$type" },
          favorites: { $first: "$favorites" },
          description: { $first: "$description" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          icon: { $first: "$icon" },
          accessUsers: { $push: "$accessUsers" },
          adminId: { $first: "$adminId" },
          defaultAccess: { $first: "$defaultAccess" },
        },
      },
    ]);

    if (teamspace.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Teamspace not found for the provided ID",
      });
    }

    res.status(200).send({
      success: true,
      message: "Teamspace data fetched successfully",
      data: teamspace[0],
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "An error occurred while getting the teamspace.",
    });
  }
};

// async function deleteChildDocs(parentID) {
//   const doc = await documentsModel.find({ parentDocument: parentID });
//   if (doc.length > 0) {
//     for (let i = 0; i < doc.length; i++) {
//       await documentsModel.findByIdAndDelete(doc[i]._id);
//       await deleteChildDocs(doc[i]._id);
//       if (doc[i].cloudinary_id) {
//         await cloudinary.uploader.destroy(doc[i]?.cloudinary_id);
//       }
//     }
//   }
// }
async function deleteChildDocs(parentID) {
  const childDocs = await documentsModel.find({ parentDocument: parentID });

  if (childDocs.length > 0) {
    const childIds = childDocs.map((doc) => doc._id);

    // Delete child documents in bulk
    await documentsModel.deleteMany({ parentDocument: parentID });

    // Recursively delete child documents
    for (const childId of childIds) {
      await pageModel.deleteMany({ document: childId._id });
      await deleteChildDocs(childId);
    }

    // Delete Cloudinary images in bulk (if applicable)
    const cloudinaryIds = childDocs
      .filter((doc) => doc.cloudinary_id)
      .map((doc) => doc.cloudinary_id);
    if (cloudinaryIds.length > 0) {
      await cloudinary.api.delete_resources(cloudinaryIds);
    }
  }
}

export const deleteTeamspaceController = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await documentsModel.findById(id);
    if (!document.adminId.equals(req.user.id)) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized access",
      });
    }
    //delete the teamspace docs
    await deleteChildDocs(id);

    if (document.type !== "teamspace") {
      await pageModel.deleteMany({ document: document._id });
    }
    await documentsModel.deleteMany({
      teamspaceId: id,
    });

    await documentsModel.findByIdAndDelete(id);

    res.status(200).send({
      success: true,
      message: "Teamspace deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "An error occurred while deleting the teamspace.",
    });
  }
};

export const updateTeamspaceController = async (req, res) => {
  try {
    const { title, icon } = req.body;
    const { id } = req.params;
    // if (!title) {
    //   return res.status(404).send({
    //     message: "Document title not found",
    //   });
    // }

    if (!id) {
      return res.status(404).send({
        message: "Teamspace id not found",
      });
    }

    if (!title && icon) {
      return res.status(404).send({
        success: false,
        message: "Teamspace details not found.",
      });
    }

    if (title && !icon) {
      const doc = await documentsModel.findByIdAndUpdate(
        id,
        {
          title,
        },
        {
          new: true,
        }
      );
      return res.status(200).send({
        success: true,
        message: "Teamspace title updated successfully",
        data: doc,
      });
    } else if (icon) {
      // Delete image from cloudinary
      // const doc = await documentsModel.findById(id);
      // if (doc.cloudinary_id) {
      //   await cloudinary.uploader.destroy(doc.cloudinary_id);
      // }
      // const result = await cloudinary.uploader.upload(req.file.path);
      const updatedDoc = await documentsModel.findByIdAndUpdate(
        id,
        {
          title,
          icon: icon,
          // cloudinary_id: result.public_id,
        },
        {
          new: true,
        }
      );

      return res.status(200).send({
        success: true,
        message: "teamspace updated successfully",
        data: updatedDoc,
      });
    }
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while updating the teamspace",
    });
  }
};

async function recursiveArchive(parentID) {
  const doc = await documentsModel.find({ parentDocument: parentID });
  if (doc.length > 0) {
    for (let i = 0; i < doc.length; i++) {
      await documentsModel.findByIdAndUpdate(
        doc[i]._id,
        {
          isArchived: true,
        },
        {
          new: true,
        }
      );
      await recursiveArchive(doc[i]._id);
    }
  }
}
// export const archiveTeamspaceController = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const document = await documentsModel.findById(id);
//     if (document.userId !== req.user.id) {
//       return res.status(401).send({
//         success: false,
//         message: "Unauthorized access",
//       });
//     }
//     //if there are already archived child folders then we need to find only isArchived:false documents

//     const childFolders = await documentsModel.find({
//       teamspaceId: id,
//     });

//     if (childFolders.length > 0) {
//       for (let i = 0; i < childFolders.length; i++) {
//         await recursiveArchive(childFolders[i]._id);
//         await documentsModel.findByIdAndUpdate(
//           childFolders[i]._id,
//           {
//             isArchived: true,
//           },
//           {
//             new: true,
//           }
//         );
//       }
//     }

//     await documentsModel.findByIdAndUpdate(
//       id,
//       {
//         isArchived: true,
//       },
//       {
//         new: true,
//       }
//     );

//     res.status(200).send({
//       success: true,
//       message: "Teamspace archived successfully",
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).send({
//       success: false,
//       message: "An error occurred while archiving the teamspace.",
//     });
//   }
// };

export const archiveTeamspaceController = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await documentsModel.findById(id);
    if (!document.adminId.equals(req.user.id)) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized access",
      });
    }

    let data = await documentsModel.findByIdAndUpdate(
      id,
      {
        isArchived: true,
      },
      {
        new: true,
      }
    );

    res.status(200).send({
      success: true,
      message: "Teamspace archived successfully",
      data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "An error occurred while archiving the teamspace.",
    });
  }
};

//share only teamspace to the other users with access type
// export const membersController = async (req, res) => {
//   try {
//     const { id } = req.user;
//     const { docId } = req.params;
//     const { userId, access } = req.body;

//     const document = await documentsModel.findById(docId);
//     if (!id && document.userId !== req.user.id) {
//       return res.status(404).send({
//         success: false,
//         message: "Unauthorized access",
//       });
//     }
//     if (!access && !userId) {
//       return res.status(404).send({
//         success: false,
//         message: "Invalid details for the access and user id.",
//       });
//     }
//     if (document.type !== "teamspace") {
//       return res.status(404).send({
//         success: false,
//         message: "Only teamspace can shared with the members",
//       });
//     }
//     const doc = await documentsModel.findOneAndUpdate(
//       { _id: docId, "accessUsers.userId": userId },
//       { $set: { "accessUsers.$.access": access } },
//       {
//         upsert: true,
//         returnNewDocument: true,
//         arrayFilters: [{ "elem.userId": userId }],
//       }
//     );

//     res.status(200).send({
//       success: true,
//       message: "Access granted to " + userId,
//       data: doc,
//     });

//   } catch (error) {
//     res.status(500).send({
//       success: false,
//       message: "An error occurred while giving access to members",
//     });
//   }
// };

export const listOfMembersController = async (req, res) => {
  try {
    const { id } = req.user;

    // var data = [];
    console.log("admin id", id);
    const accessData = await accessModel.find({ adminId: id });

    //remove guest user from the list of members
    //Admins can grant either guest or member access to users for different teamspaces.
    // for (const access of accessData) {
    //   console.log("access", access);
    //   const user = await userModel.findOne({ email: access.userEmail });
    //   let memberCount = 0;
    //   const teamspaces = await documentsModel
    //     .find({
    //       _id: {
    //         $in: access?.teamspaces?.map((space) =>
    //           !space.isGuest ? space.teamspaceId : null
    //         ),
    //       },
    //     })
    //     .select(" -createdAt -updatedAt");
    //   console.log("teamspaces", teamspaces);
    //   const populatedTeamspaces = teamspaces.map((space) => {
    //     const teamspaceAccess = access.teamspaces.find((ts) =>
    //       ts.teamspaceId.equals(space._id)
    //     );
    //     console.log("teamspaceAccess", teamspaceAccess);
    //     return {
    //       ...space.toObject(),
    //       access: teamspaceAccess.access,
    //       memberCount: space.accessUsers.length,
    //     };
    //   });
    //   console.log("populatedTeamspaces", populatedTeamspaces);
    //   console.log("user", user);
    //   if (user === null) {
    //     data.push({
    //       name: "",
    //       image: "",
    //       logo: "",
    //       email: access.userEmail,
    //       teamspaces: populatedTeamspaces.select("-accessUsers"),
    //     });
    //   } else {
    //     data.push({
    //       name: user.name,
    //       image: user.image || "",
    //       logo: user.logo || "",
    //       email: user.email,
    //       teamspaces: populatedTeamspaces,
    //     });
    //   }
    // }
    const data = [];

    await Promise.all(
      accessData.map(async (access) => {
        try {
          const user = await userModel.findOne({ email: access.userEmail });

          const teamspaces = await documentsModel
            .find({
              _id: {
                $in: access?.teamspaces?.map((space) =>
                  !space.isGuest ? space.teamspaceId : null
                ),
              },
            })
            .select("-createdAt -updatedAt");
          // console.log("teamspaces", teamspaces);
          const populatedTeamspaces = await Promise.all(
            teamspaces.map(async (space) => {
              return {
                ...space.toObject(),
                memberCount: space.accessUsers.length,
              };
            })
          );
          const userData = {
            name: user ? user.name : "",
            image: user ? user.image || "" : "",
            logo: user ? user.logo || "" : "",
            email: user ? user.email : access.userEmail,
            teamspaces: populatedTeamspaces.map((ts) => {
              const { accessUsers, ...obj } = ts;
              return obj;
            }),
          };
          //if there is teamspace available with isGuest:false then only push the data
          if (populatedTeamspaces.length) data.push(userData);
        } catch (error) {
          console.error("Error processing access data:", error);
        }
      })
    );
    try {
      const aggregateData = await accessModel.aggregate([
        {
          $match: {
            adminId: new mongoose.Types.ObjectId(id),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userEmail",
            foreignField: "email",
            as: "user",
          },
        },
      ]);

      // console.log("aggregateData", aggregateData);
    } catch (error) {
      console.error("Error during aggregation:", error);
    }
    // const data = await accessModel.aggregate([
    //   {
    //     $match: {
    //        adminId: new mongoose.Types.ObjectId(id),
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "users",
    //       localField: "userEmail",
    //       foreignField: "email",
    //       as: "user",
    //     },
    //   },
    //   {
    //     $unwind: "$user",
    //   },
    //   {
    //     $lookup: {
    //       from: "documents",
    //       let: { teamspaces: "$teamspaces" },
    //       pipeline: [
    //         {
    //           $match: {
    //             $expr: {
    //               $in: [
    //                 "$_id",
    //                 {
    //                   $map: {
    //                     input: "$$teamspaces",
    //                     as: "ts",
    //                     in: {
    //                       $cond: [
    //                         { $eq: ["$$ts.isGuest", false] },
    //                         "$$ts.teamspaceId",
    //                         null,
    //                       ],
    //                     },
    //                   },
    //                 },
    //               ],
    //             },
    //           },
    //         },
    //         {
    //           $project: {
    //             createdAt: 0,
    //             updatedAt: 0,
    //           },
    //         },
    //       ],
    //       as: "teamspaces",
    //     },
    //   },
    //   {
    //     $addFields: {
    //       teamspaces: {
    //         $map: {
    //           input: "$teamspaces",
    //           as: "space",
    //           in: {
    //             $mergeObjects: [
    //               "$$space",
    //               {
    //                 access: {
    //                   $arrayElemAt: [
    //                     {
    //                       $filter: {
    //                         input: "$teamspaces",
    //                         cond: { $eq: ["$$this._id", "$$space._id"] },
    //                       },
    //                     },
    //                     0,
    //                   ],
    //                 },
    //                 memberCount: { $size: "$$space.accessUsers" },
    //               },
    //             ],
    //           },
    //         },
    //       },
    //     },
    //   },
    //   {
    //     $project: {
    //       _id: "$user._id",
    //       name: { $ifNull: ["$user.name", ""] },
    //       image: { $ifNull: ["$user.image", ""] },
    //       logo: { $ifNull: ["$user.logo", ""] },
    //       email: { $ifNull: ["$user.email", "$userEmail"] },
    //       teamspaces: {
    //         $cond: {
    //           if: { $eq: [{ $type: "$user.email" }, "missing"] },
    //           then: {
    //             $map: {
    //               input: "$teamspaces",
    //               as: "ts",
    //               in: { $mergeObjects: ["$$ts", { accessUsers: [] }] },
    //             },
    //           },
    //           else: "$teamspaces",
    //         },
    //       },
    //     },
    //   },
    // ]);
    res.status(200).send({
      success: true,
      message: "member list",
      data: data,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error while getting members list.",
    });
  }
};
export const listOfGuestsController = async (req, res) => {
  try {
    const { id } = req.user;

    // var data = [];
    console.log("admin id", id);
    const accessData = await accessModel.find({ adminId: id });

    const data = [];

    await Promise.all(
      accessData.map(async (access) => {
        try {
          const user = await userModel.findOne({ email: access.userEmail });

          const teamspaces = await documentsModel
            .find({
              _id: {
                $in: access?.teamspaces?.map((space) =>
                  space.isGuest ? space.teamspaceId : null
                ),
              },
            })
            .select("-createdAt -updatedAt");

          const populatedTeamspaces = await Promise.all(
            teamspaces.map(async (space) => {
              return {
                ...space.toObject(),
                memberCount: space.accessUsers.length,
              };
            })
          );
          const userData = {
            name: user ? user.name : "",
            image: user ? user.image || "" : "",
            logo: user ? user.logo || "" : "",
            email: user ? user.email : access.userEmail,
            teamspaces: populatedTeamspaces.map((ts) => {
              const { accessUsers, ...obj } = ts;
              return obj;
            }),
          };

          //if there is teamspace available with isGuest:true then only push the data
          if (populatedTeamspaces.length) data.push(userData);
        } catch (error) {
          console.error("Error processing access data:", error);
        }
      })
    );
    try {
      const aggregateData = await accessModel.aggregate([
        {
          $match: {
            adminId: new mongoose.Types.ObjectId(id),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userEmail",
            foreignField: "email",
            as: "user",
          },
        },
      ]);

      console.log("aggregateData", aggregateData);
    } catch (error) {
      console.error("Error during aggregation:", error);
    }
    res.status(200).send({
      success: true,
      message: "Guest list",
      data: data,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error while getting members list.",
    });
  }
};

export const updateAccessController = async (req, res) => {
  try {
    //need to update the access in accessModel and the teamspace document

    const { email, access } = req.body;
    const { docId } = req.params;
    if (!email) {
      return res.status(404).send({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const data = await accessModel.findOne({
      adminId: req.user.id,
      userEmail: email,
      "teamspaces.teamspaceId": docId,
    });
    const { isGuest } = await data.teamspaces.find((item) =>
      item.teamspaceId.equals(docId)
    );
    if (isGuest && access !== "canView") {
      return res.status(200).send({
        success: true,
        message: "Guest can only view the teamspace",
      });
    }

    // Update access in accessModel
    await accessModel.updateOne(
      {
        adminId: req.user.id,
        userEmail: email,
        "teamspaces.teamspaceId": docId,
      },
      { $set: { "teamspaces.$.access": access } }
    );

    // Update access in documentsModel
    await documentsModel.updateOne(
      { _id: docId, "accessUsers.email": email },
      { $set: { "accessUsers.$.access": access } }
    );

    res.status(200).send({
      success: true,
      data: data,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error while updating access",
    });
  }
};

/////////////////////////
// Track the last notification time

// for notification email
// if user change somthing on the page then notify the admin only once in 30 min
// multiple user will have access to page

let timerCheck = {};

console.log("timerCheck", timerCheck);

export const membersController = async (req, res) => {
  try {
    const { id } = req.user;
    const { docId } = req.params;
    const { access, email } = req.body;
    let currentTime = new Date();
    currentTime = currentTime.getTime();
    if (!timerCheck[id]) {
      timerCheck[id] = {};
    }
    if (!access) {
      return res.status(404).send({
        success: false,
        message: "Invalid details for access.",
      });
    }
    if (!email) {
      return res.status(404).send({
        success: false,
        message: "Invalid details for user.",
      });
    }

    const checkUser = await userModel.findOne({ email: email });
    const owner = await userModel.findById(id);
    const document = await documentsModel.findOne({ _id: docId });
    if (!document || document === null) {
      return res.status(404).send({
        success: false,
        message: "Document not found.",
      });
    }
    //cheking for admin of the document and req id
    if (!document.adminId.equals(id)) {
      return res.status(404).send({
        success: false,
        message:
          "Unauthorized access only admin of the document can give access to the members.",
      });
    }
    //only member are added in to the teamspace not in documents
    if (document.type !== "teamspace") {
      return res.status(404).send({
        success: false,
        message: "Only teamspace can be shared with members.",
      });
    }
    //for now this three type of acces is supported
    const validAccessValues = ["fullAccess", "canEdit", "canView"];

    if (!validAccessValues.includes(access)) {
      return res
        .status(400)
        .send({ success: false, message: "Invalid access level" });
    }
    // console.log("step 1");

    //finding the access group in access collection for the admin and user email
    //user can be invited for multiple teamspaces with different access levels
    const accessData = await accessModel.findOne({
      adminId: id,
      userEmail: email,
    });
    // console.log("accessModel", accessData);

    if (accessData !== null) {
      const existingTeamspace = accessData.teamspaces.find((space) =>
        space.teamspaceId.equals(docId)
      );
      console.log("existingTeamspace", existingTeamspace);

      if (!existingTeamspace || existingTeamspace === null) {
        accessData.teamspaces.push({
          teamspaceId: docId,
          access,
          isGuest: false,
        });
        await accessData.save();
      } else {
        //here if user already exist as guest or another details then replaceing the old details with the new one.
        await accessModel.updateOne(
          { _id: accessData._id },
          {
            $pull: { teamspaces: { _id: existingTeamspace._id } },
          }
        );
        accessData.teamspaces.push({
          teamspaceId: docId,
          access,
          isGuest: false,
        });
        await accessData.save();
      }
    } else {
      // new access then create a new group for admin and user
      const newAccess = new accessModel({
        userId: checkUser?._id,
        adminId: id,
        userEmail: email,
        teamspaces: [{ teamspaceId: docId, access }],
      });
      await newAccess.save();
    }
    await documentsModel.updateOne(
      { _id: docId },
      {
        $pull: { accessUsers: { email: email } },
      }
    );
    // console.log("step 2");

    await documentsModel.updateOne(
      { _id: docId },
      {
        $addToSet: {
          accessUsers: {
            email: email,
            access,
            userId: checkUser?._id,
            isGuest: false,
          },
        },
      },
      {
        upsert: true,
      }
    );

    if (checkUser) {
      if (
        !timerCheck[id][email] ||
        currentTime - timerCheck[id][email] >= 15 * 60 * 1000
      ) {
        var transporter = nodemailer.createTransport({
          service: "gmail",
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: {
            user: process.env.EMAIL_NODEMAILER,
            pass: process.env.PASS_NODEMAILER,
          },
        });

        var mailOptions = {
          from: "syeddev9@gmail.com",
          to: email,
          subject: "Invite Link to join the shared document.",
          html:
            `<p><b>${owner.name}</b> is send you a link of teamspace: ${document.title}, Click <a href="http://localhost:5173/documents` +
            '">here</a> to view.</p>',
        };

        await transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            return res.status(200).send({
              success: true,
              message: "invite mail sent on " + email,
            });
          }
        });
        console.log("timerCheck 1", timerCheck);

        timerCheck[id][email] = currentTime;
      } else {
        console.log("timerCheck 2", timerCheck);

        return res.status(200).send({
          success: true,
          message: "Access granted to " + email,
        });
      }
    } else {
      if (
        !timerCheck[id][email] ||
        currentTime - timerCheck[id][email] >= 15 * 60 * 1000
      ) {
        var transporter = nodemailer.createTransport({
          service: "gmail",
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: {
            user: process.env.EMAIL_NODEMAILER,
            pass: process.env.PASS_NODEMAILER,
          },
        });

        var mailOptions = {
          from: process.env.EMAIL_NODEMAILER,
          to: email,
          subject:
            "Invite Link for Notion clone app and join the shared document.",
          html:
            owner.name +
            `<p><b>${owner.name}</b> is send you a link of teamspace: ${document.title}, Click <a href="http://localhost:5173/documents` +
            '">here</a> to join Notion.</p>',
        };

        await transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            return res.status(200).send({
              success: true,
              message:
                "User is not registered with Notion invite mail sent on " +
                email,
            });
          }
        });
        // console.log("timerCheck 3", timerCheck);

        timerCheck[id][email] = currentTime;
      } else {
        // console.log("timerCheck 4", timerCheck);

        res.status(200).send({
          success: true,
          message:
            "User is not registered with Notion invite mail sent on " + email,
        });
      }
      // need to send the invite email to the new user to join notion and view the invite document
    }
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while giving access to member",
    });
  }
};

export const guestController = async (req, res) => {
  try {
    const { id } = req.user;
    const { docId } = req.params;
    const { email } = req.body;
    let currentTime = new Date();
    currentTime = currentTime.getTime();
    if (!timerCheck[id]) {
      timerCheck[id] = {};
    }
    if (!email) {
      return res.status(404).send({
        success: false,
        message: "Please provide guest email.",
      });
    }
    const checkUser = await userModel.findOne({ email });
    const owner = await userModel.findById(id);
    const document = await documentsModel.findOne({ _id: docId });
    const accessData = await accessModel.findOne({
      adminId: id,
      userEmail: email,
    });
    console.log("Access data: ", accessData, ">>>>");
    if (accessData !== null) {
      const existingMember = accessData?.teamspaces.find((teamspace) => {
        return teamspace.teamspaceId.equals(docId);
      });
      console.log("existingMember: " + existingMember);
      if (existingMember?.teamspaceId) {
        return res.status(403).send({
          success: false,
          message: `${email}  is already in this teamspace as ${
            existingMember?.isGuest ? "Guest." : "Member."
          }`,
        });
      } else {
        await accessData.teamspaces.push({
          teamspaceId: docId,
          access: "canView",
          isGuest: true,
        });
        await accessData.save();
      }
    } else {
      const newAccess = await new accessModel({
        userId: checkUser?._id,
        adminId: id,
        userEmail: email,
        teamspaces: [{ teamspaceId: docId, access: "canView", isGuest: true }],
      });
      await newAccess.save();
      console.log("newAccess", newAccess);
    }

    //adding the user details in teamspaces document as well
    await documentsModel.updateOne(
      { _id: docId },
      {
        $pull: { accessUsers: { email: email } },
      }
    );
    await documentsModel.updateOne(
      { _id: docId },
      {
        $addToSet: {
          accessUsers: {
            email: email,
            access: "canView",
            userId: checkUser?._id,
            isGuest: true,
          },
        },
      },
      {
        upsert: true,
      }
    );
    if (checkUser) {
      if (
        !timerCheck[id][email] ||
        currentTime - timerCheck[id][email] >= 15 * 60 * 1000
      ) {
        var transporter = nodemailer.createTransport({
          service: "gmail",
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: {
            user: process.env.EMAIL_NODEMAILER,
            pass: process.env.PASS_NODEMAILER,
          },
        });

        var mailOptions = {
          from: "syeddev9@gmail.com",
          to: email,
          subject: "Invite Link to join the shared document.",
          html:
            `<p><b>${owner.name}</b> is send you a link of teamspace: ${document.title}, Click <a href="http://localhost:5173/documents` +
            '">here</a> to view.</p>',
        };

        await transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            return res.status(200).send({
              success: true,
              message: "invite mail sent on " + email,
            });
          }
        });
        timerCheck[id][email] = currentTime;
      } else {
        return res.status(200).send({
          success: true,
          message: "Access granted to " + email,
          // data: doc2,
        });
      }
    } else {
      if (
        !timerCheck[id][email] ||
        currentTime - timerCheck[id][email] >= 15 * 60 * 1000
      ) {
        var transporter = nodemailer.createTransport({
          service: "gmail",
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: {
            user: process.env.EMAIL_NODEMAILER,
            pass: process.env.PASS_NODEMAILER,
          },
        });

        var mailOptions = {
          from: process.env.EMAIL_NODEMAILER,
          to: email,
          subject:
            "Invite Link for Notion clone app and join the shared document.",
          html:
            owner.name +
            `<p><b>${owner.name}</b> is send you a link of teamspace: ${document.title}, Click <a href="http://localhost:5173/documents` +
            '">here</a> to join.</p>',
        };

        await transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            return res.status(200).send({
              success: true,
              message:
                "User is not registered with Notion invite mail sent on " +
                email,
            });
          }
        });
        timerCheck[id][email] = currentTime;
      } else {
        return res.status(200).send({
          success: true,
          message:
            "User is not registered with Notion invite mail sent on " + email,
          // data: doc2,
        });
      }
      // need to send the invite email to the new user to join notion and view the invite document
    }
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while giving access to guest",
    });
  }
};

export const getSharedDocuments = async (req, res) => {
  try {
    const sharedPages = await documentsModel.find({
      "accessUsers.userId": req.user.id,
      isArchived: false,
      isPrivate: false,
    });
    console.log("sharedPages", sharedPages);
    res.status(200).send({
      success: true,
      message: "Pages list fetched successfully",
      data: sharedPages,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "An error occurred while getting the shared pages.",
    });
  }
};

export const leaveTeamspaceController = async (req, res) => {
  try {
    const { id } = req.user;
    const { docId } = req.params;
    if (!docId) {
      return res.status(404).send({
        success: false,
        message: "Teamspace id is required.",
      });
    }
    const user = await userModel.findById(id);

    let check = await documentsModel.findOne({
      _id: docId,
      "accessUsers.email": user.email,
      type: "teamspace",
    });
    console.log("checkcheck", check);

    if (check === null) {
      return res.status(200).send({
        success: true,
        message: "Already left the teamspace or not a member.",
      });
    }

    let teamspace = await documentsModel.findOneAndUpdate(
      { _id: docId, type: "teamspace" },
      {
        $pull: { accessUsers: { email: user.email } },
      }
    );

    let accessData = await accessModel.updateOne(
      {
        adminId: check.adminId,
        userEmail: user.email,
      },
      { $pull: { teamspaces: { teamspaceId: docId } } }
    );

    // console.log("updated teamspace", teamspace);
    res.status(200).send({
      success: true,
      message: "Successfully left the teamspace.",
      // data: teamspace,
    });
  } catch (error) {
    res.status(500).send({
      message: "An error occurred while leaving the teamspace",
      success: false,
    });
  }
};
