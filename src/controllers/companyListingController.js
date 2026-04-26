const prisma = require("../config/prisma");

// 1. Show the creation form
exports.getCreateCompanyListing = (req, res) => {
    res.render("company-listing-create", { title: "Post a Job" });
};

// 2. Save the job to the database
exports.createCompanyListing = async (req, res) => {
    try {
        const { field, location, availability } = req.body;
        
        // This is the "Connection" to the table - using the logged-in company's ID
        await prisma.companylisting.create({
            data: {
                field: field,
                location: location,
                availability: availability,
                companyId: req.session.company.id // The safe session ID
            }
        });

        req.flash("success_msg", "Job posted successfully!");
        res.redirect("/external-jobs"); // Send them back to the main list
    } catch (error) {
        console.error(error);
        req.flash("error_msg", "Failed to post job.");
        res.redirect("/company-listings/create");
    }
};