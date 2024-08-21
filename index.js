const express = require('express')
const bodyParser = require('body-parser');
const connection = require('./dbconfig')
const app = express()
app.use(express.json())
const cors = require('cors');
app.use(cors());
app.use(bodyParser.json()); // This line ensures JSON bodies are parsed

// INSERT Quarter Task Details

app.post('/create_quarter_task', async (req, res) => {
  const { company_id, financial_year, emp_code, staffid, quarter_no, created_by, goals } = req.body;

  if (goals.length == 0) {
    res.status(200).json({ success: false, message: 'Sorry ! No Goal Data Found.', alert_type: 'error' });
  } else {
    try {
      const insertedDetails = [];
      for (const goal of goals) {
        const { goal_title, kpi_data } = goal;

        // Insert into hrms_prm_task_title
        let insertTitleQuery = 'INSERT INTO hrms_prm_task_title (company_id, financial_year, emp_code, staffid, quarter_no, goal_title, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)';
        let titleResult;

        try {
          titleResult = await new Promise((resolve, reject) => {
            connection.query(insertTitleQuery, [company_id, financial_year, emp_code, staffid, quarter_no, goal_title, created_by], (err, result) => {
              if (err) return reject(err);
              resolve(result);
            });
          });

          console.log('Title Insert Result:', titleResult);
        } catch (queryError) {
          console.error('Error during title insertion:', queryError);
          return res.status(500).send('Error inserting title.');
        }

        const title_id = titleResult.insertId;
        console.log('Inserted title_id:', title_id);

        // Insert kpi_details
        for (const kpi of kpi_data) {
          const { kpi_detail, uom, total_target, kpi_target } = kpi;

          if (!uom || uom === 'Select UOM') {
            return res.status(400).json({ success: false, message: 'UOM is not selected', alert_type: 'danger' });
          }

          let kpiResult;

          try {
            kpiResult = await new Promise((resolve, reject) => {
              connection.query(
                'INSERT INTO hrms_prm_task_title_details (company_id, financial_year, emp_code, staffid, goal_id, goal_task, uom, total_target,created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [company_id, financial_year, emp_code, staffid, title_id, kpi_detail, uom, total_target, created_by],
                (err, result) => {
                  if (err) return reject(err);
                  resolve(result);
                }
              );
            });

            const kpi_id = kpiResult.insertId;
            console.log('Inserted kpi_id:', kpi_id);

            // Insert kpi_target
            for (const target of kpi_target) {
              try {
                await new Promise((resolve, reject) => {
                  connection.query(
                    'INSERT INTO hrms_prm_kpi_target_achievement (company_id, financial_year, emp_code, staffid, kpi_id, review_month, target, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [company_id, financial_year, emp_code, staffid, kpi_id, target.month, target.target, created_by],
                    (err, result) => {
                      if (err) return reject(err);
                      resolve(result);
                    }
                  );
                });
              } catch (queryError) {
                console.error('Error during KPI target insertion:', queryError);
                return res.status(500).send('Error inserting KPI target details.');
              }
            }

            // Retrieve the inserted kpi details
            let kpiDetailResult = await new Promise((resolve, reject) => {
              connection.query(
                'SELECT id,company_id,staffid,emp_code,goal_id,financial_year,goal_task,uom,total_target FROM hrms_prm_task_title_details WHERE id = ?',
                [kpi_id],
                (err, result) => {
                  if (err) return reject(err);
                  resolve(result);
                }
              );
            });

            insertedDetails.push(...kpiDetailResult);

          } catch (queryError) {
            console.error('Error during task details insertion:', queryError);
            return res.status(500).send('Error inserting task details.');
          }
        }
      }

      res.status(200).json({ success: true, message: 'Goals and KPI targets added successfully.', alert_type: 'success', insertedDetails: insertedDetails });
    } catch (error) {
      console.error('Unexpected error:', error);
      res.status(500).send('Unexpected error.');
    }
  }
});


// GET Quarter Month Details

app.get('/get_quarterly_month_data', (req, resp) => {
  let sqlquery = `
    SELECT value2 
    FROM hrms_general_settings 
    WHERE value = ?
  `;

  connection.query(sqlquery, [req.query.quarterId], (err, result) => {
    if (err) {
      console.error('Error connection:', err); // Log the error
      resp.status(500).send('Error connecting to the database');
    } else {
      if (result.length > 0) {
        let jsonData = result[0].value2; // Assuming value2 contains the JSON string
        try {
          let parsedData = JSON.parse(jsonData); // Parse the JSON string into an object
          resp.json(parsedData);
        } catch (parseError) {
          console.error('JSON parse error:', parseError); // Log parse error
          resp.status(500).send('Error parsing data');
        }
      } else {
        resp.status(404).send('No data found');
      }
    }
  });
});


// GET Goal and KPI Details

app.get('/fetch_goals', (req, res) => {
  const { company_id, financial_year, emp_code, staffid, quarter_no } = req.query;

  let goalQuery = `
  SELECT *
    FROM hrms_prm_task_title 
    WHERE company_id = ? AND financial_year = ? AND emp_code = ? AND staffid = ? AND quarter_no = ?
    `;

  connection.query(goalQuery, [company_id, financial_year, emp_code, staffid, quarter_no], (err, goals) => {
    if (err) {
      console.error('Error fetching goals:', err);
      return res.status(500).send('Error fetching goals.');
    }

    if (goals.length === 0) {
      // Send an empty array if no goals are found
      return res.status(200).json([]);
    }

    // Extract goal IDs to fetch related data
    const goalIds = goals.map(goal => goal.id); // Adjust the property if the primary key is named differently

    let kpiDetailsQuery = `
      SELECT *
    FROM hrms_prm_task_title_details 
      WHERE goal_id IN(?)
    `;

    connection.query(kpiDetailsQuery, [goalIds], (err, kpiDetails) => {
      if (err) {
        console.error('Error fetching KPI details:', err);
        return res.status(500).send('Error fetching KPI details.');
      }

      const kpiIds = kpiDetails.map(detail => detail.id); // Adjust the property if the primary key is named differently

      let kpiTargetsQuery = `
  SELECT *
    FROM hrms_prm_kpi_target_achievement 
        WHERE kpi_id IN(?) 
        ORDER BY id ASC
    `;

      connection.query(kpiTargetsQuery, [kpiIds], (err, kpiTargets) => {
        if (err) {
          console.error('Error fetching KPI targets:', err);
          return res.status(500).send('Error fetching KPI targets.');
        }


        if (quarter_no == 3) {

          kpiDetails.forEach(detail => {
            const targets = kpiTargets.filter(target => target.kpi_id === detail.id);
            const reviewMonths = targets.map(target => target.review_month);

            // Check and add dummy targets for review months 7, 8, and 9
            ['7', '8', '9'].forEach(month => {
              if (!reviewMonths.includes(month)) {
                kpiTargets.push({
                  kpi_id: detail.id,
                  review_month: month,
                  target: 0,  // Adjust as needed for dummy data
                  achieved: 0 // Adjust as needed for dummy data
                });
              }
            });
          });

          // Sort kpiTargets to ensure that the entries with review_months '7', '8', and '9' are at the beginning
          kpiTargets.sort((a, b) => {
            const priorityMonths = ['7', '8', '9'];
            if (priorityMonths.includes(a.review_month) && priorityMonths.includes(b.review_month)) {
              return priorityMonths.indexOf(a.review_month) - priorityMonths.indexOf(b.review_month);
            }
            if (priorityMonths.includes(a.review_month)) return -1; // Move priority months to the beginning
            if (priorityMonths.includes(b.review_month)) return 1;  // Move priority months to the beginning
            return 0; // Keep the original order for other months
          });
        }



        // Combine results
        const results = goals.map(goal => {
          return {
            ...goal,
            kpi_data: kpiDetails
              .filter(detail => detail.goal_id === goal.id)
              .map(detail => {
                return {
                  ...detail,
                  kpi_target: kpiTargets.filter(target => target.kpi_id === detail.id)
                };
              })
          };
        });

        res.status(200).json(results);
      });
    });
  });
});

// UPDATE KPI Achievements

app.put('/update_balance_kpiTarget', (req, res) => {
  const kpiId = parseFloat(req.query.kpiId);
  const nextKpiId = parseFloat(req.query.next_kpi_id);
  const serial = req.query.serial;
  const thirdKpiId = req.query.thirdm_kpi_id ? parseFloat(req.query.thirdm_kpi_id) : null;
  const { targeted, achieved, target: targetElements, totalTarget } = req.body;
  const targetedNum = parseFloat(targeted);
  const achievedNum = parseFloat(achieved);
  const totalTargetNum = parseFloat(totalTarget);

  if (isNaN(achievedNum) || isNaN(totalTargetNum)) {
    return res.status(400).json({ error: 'Invalid or missing required fields' });
  }

  connection.query('UPDATE hrms_prm_kpi_target_achievement SET achieved = ? WHERE id = ?', [achievedNum, kpiId], (err, results) => {
    if (err || results.affectedRows === 0) {
      return res.status(err ? 500 : 404).json({ error: err ? 'Database error' : 'kpiId not found' });
    }

    if (serial == 2 || serial == 1) {

      let updateNextTargetQuery = 'UPDATE hrms_prm_kpi_target_achievement SET target = ? WHERE id = ?';
      let updateNextTargetData = [targetElements, nextKpiId];

      if (achievedNum >= totalTargetNum) {
        updateNextTargetData[0] = 0;
        connection.query(updateNextTargetQuery, updateNextTargetData, (err, results) => {
          if (err || results.affectedRows === 0) {
            return res.status(err ? 500 : 404).json({ error: err ? 'Database error' : 'nextKpiId not found' });
          }

          if (thirdKpiId) {
            connection.query('UPDATE hrms_prm_kpi_target_achievement SET target = 0 WHERE id = ?', [thirdKpiId], (err, results) => {
              if (err || results.affectedRows === 0) {
                // Handle case where thirdKpiId does not exist or other errors
                if (err) {
                  console.error('Database error:', err);
                } else {
                  console.warn('thirdKpiId not found or no rows affected');
                }
              }
              // Responding based on next KPI update success
              res.status(200).json({ success: true, message: 'KPI Achievement updated successfully', alert_type: 'success' });
            });
          } else {
            res.status(200).json({ success: true, message: 'KPI Achievement updated successfully', alert_type: 'success' });
          }
        });

      } else if (achievedNum < targetedNum) {

        connection.query(updateNextTargetQuery, updateNextTargetData, (err, results) => {
          if (err || results.affectedRows === 0) {
            return res.status(err ? 500 : 404).json({ error: err ? 'Database error' : 'nextKpiId not found' });
          }
          res.status(200).json({ success: true, message: 'KPI Achievement updated successfully', alert_type: 'success' });

        })
      } else if (achievedNum > targetedNum) {
        let updateThirdTargetQuery = 'UPDATE hrms_prm_kpi_target_achievement SET target = ? WHERE id = ?';

        if (serial == 2) {
          // Update nextKpiId
          connection.query(updateNextTargetQuery, [targetElements, nextKpiId], (err, results) => {
            if (err || results.affectedRows === 0) {
              return res.status(err ? 500 : 404).json({ error: err ? 'Database error' : 'nextKpiId not found' });
            }

            // Update thirdKpiId
            if (thirdKpiId) {
              connection.query(updateThirdTargetQuery, [targetElements, thirdKpiId], (err, results) => {
                if (err || results.affectedRows === 0) {
                  return res.status(err ? 500 : 404).json({ error: err ? 'Database error' : 'thirdKpiId not found' });
                }
                res.status(200).json({ success: true, message: 'KPI Achievement updated successfully', alert_type: 'success' });
              });
            } else {
              res.status(200).json({ success: true, message: 'KPI Achievement updated successfully', alert_type: 'success' });
            }
          });
        } else if (serial == 1) {

          // Only update thirdKpiId
          connection.query(updateThirdTargetQuery, [targetElements, nextKpiId], (err, results) => {
            if (err || results.affectedRows === 0) {
              return res.status(err ? 500 : 404).json({ error: err ? 'Database error' : 'thirdKpiId not found' });
            }
            res.status(200).json({ success: true, message: 'KPI Achievement updated successfully', alert_type: 'success' });
          });
        }
      }
    } else {
      res.status(200).json({ success: true, message: 'KPI Achievement updated successfully', alert_type: 'success' });
    }
  });
});

// FETCH KPI DATA BY ID


app.get('/fetch_kpi_data_byId', (req, res) => {
  const serial = req.query.serial;
  const kpiId = parseInt(req.query.kpiId, 10);
  const nextKpiId = parseInt(req.query.next_kpi_id, 10);
  const thirdKpiId = req.query.thirdm_kpi_id ? parseInt(req.query.thirdm_kpi_id, 10) : null;


  if (isNaN(kpiId) || isNaN(nextKpiId)) {
    return res.status(400).json({ error: 'Missing or invalid required parameters' });
  }

  const ids = [kpiId, nextKpiId, thirdKpiId].filter(id => id !== null);

  let query = 'SELECT id, achieved, target FROM hrms_prm_kpi_target_achievement WHERE id IN (?)';

  connection.query(query, [ids], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'No data found for the provided IDs' });
    }

    const response = {};

    results.forEach(row => {
      if (row.id === kpiId) {
        response.achieved = row.achieved;
      }
      if (row.id === nextKpiId) {
        response.nexttarget = row.target;
      }
      if (row.id === thirdKpiId) {
        response.thirdKpiTarget = row.target;
      }
    });

    if (Object.keys(response).length > 0) {
      res.status(200).json(response);
    } else {
      res.status(404).json({ error: 'No data found for the provided IDs' });
    }
  });
});


// PUT route to update comment
app.put('/update_kpi_comment_achieved', (req, res) => {
  const kpiId = req.query.kpiId;
  const { comment } = req.body;

  if (!kpiId || !comment) {
    return res.status(400).json({ error: 'Missing kpiId or comment' });
  }

  let updateCommentQuery = `
    UPDATE hrms_prm_kpi_target_achievement
    SET comment = ?
    WHERE id = ?
  `;

  connection.query(updateCommentQuery, [comment, kpiId], (err, results) => {
    if (err) {
      console.error('Error updating comment:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'kpiId not found' });
    }

    res.status(200).json({ success: true, message: 'Comment updated successfully', alert_type: 'success' });
  });
});


// PUT route to Set New Traget when Target becomes 0
app.put('/update_new_target', (req, res) => {
  const kpi_detailsid = req.query.kpi_detailsid;
  const { target } = req.body;

  if (!kpi_detailsid || !target) {
    return res.status(400).json({ error: 'Missing New Target' });
  }

  let updateNewTargetQuery = `
    UPDATE hrms_prm_kpi_target_achievement
    SET target = ?
    WHERE id = ?
  `;

  connection.query(updateNewTargetQuery, [target, kpi_detailsid], (err, results) => {
    if (err) {
      console.error('Error updating New Trget:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'kpiId not found' });
    }

    res.status(200).json({ success: true, message: 'New Target set successfully', alert_type: 'success' });
  });
});


// fetch KPI Data by particular ID

app.get('/fetch_kpiDetailsby_Id', (req, res) => {
  const kpiDetailsId = parseInt(req.query.kpiDetailsId, 10);
  if (isNaN(kpiDetailsId)) {
    return res.status(400).json({ error: 'Missing or invalid required parameters' });
  }

  let query = 'SELECT id as kpiDetailsId, company_id, financial_year,emp_code,staffid,kpi_id,review_month,target FROM hrms_prm_kpi_target_achievement WHERE id = ?';

  connection.query(query, kpiDetailsId, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'No data found for the provided IDs' });
    }
    if (results) {
      res.status(200).json(results);
    } else {
      res.status(404).json({ error: 'No data found for the provided IDs' });
    }
  });
});


app.post('/insert_kpi_targetHistory', async (req, res) => {
  const { company_id, page, candidate_staff_id, key_title, details, created_by } = req.body;

  try {
    let query = `INSERT INTO hrms_activity_log_details (company_id, page, candidate_staff_id, key_title, details, created_by)
      VALUES (?, ?, ?, ?, ?, ?)`;

    await new Promise((resolve, reject) => {
      connection.query(query, [company_id, page, candidate_staff_id, key_title, JSON.stringify(details), created_by], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
      );
    });

    res.status(200).json({ success: true, message: 'Goals and KPI targets added successfully.', alert_type: 'success' });
  } catch (queryError) {
    console.error('Error during KPI target history insertion:', queryError);
    res.status(500).send('Error inserting KPI target history.');
  }
});


app.put('/update_oldTargets', (req, res) => {
  const { kpiid } = req.query;
  const { company_id, financial_year, emp_code, staffid, goal_task, uom, total_target, kpi_target, created_by, updated_by } = req.body;

  // Update hrms_prm_task_title_details
  let updateTitleDetailsQuery = `UPDATE hrms_prm_task_title_details SET goal_task = ?, uom = ?, total_target = ?, updated_by = ? WHERE id = ?`;
  connection.query(updateTitleDetailsQuery, [goal_task, uom, total_target, updated_by, kpiid], (err, result) => {
    if (err) {
      console.error('Error updating hrms_prm_task_title_details:', err);
      return res.status(500).send('Error updating hrms_prm_task_title_details');
    }

    // Process kpi_target data
    let processKpiTargetPromises = kpi_target.map(kpi => {
      const { review_month, target } = kpi;
      return new Promise((resolve, reject) => {
        // Check if data exists for kpiid and review_month
        let checkKpiExistenceQuery = `SELECT * FROM hrms_prm_kpi_target_achievement WHERE kpi_id = ? AND review_month = ?`;
        connection.query(checkKpiExistenceQuery, [kpiid, review_month], (err, result) => {
          if (err) {
            console.error('Error checking kpiid and review_month existence:', err);
            reject(err);
          } else {
            if (result.length > 0) {
              // Data exists, perform update
              let updateKpiTargetAchievementQuery = `UPDATE hrms_prm_kpi_target_achievement SET target = ?, updated_by = ? WHERE kpi_id = ? AND review_month = ?`;
              connection.query(updateKpiTargetAchievementQuery, [target, updated_by, kpiid, review_month], (err, result) => {
                if (err) {
                  console.error('Error updating hrms_prm_kpi_target_achievement:', err);
                  reject(err);
                } else {
                  resolve(result);
                }
              });
            } else {
              // Data does not exist, perform insert
              let insertKpiTargetAchievementQuery = `INSERT INTO hrms_prm_kpi_target_achievement (company_id,financial_year,emp_code,staffid,kpi_id, review_month, target, created_by) VALUES (?, ?, ?, ?, ?, ?, ? ,?)`;
              connection.query(insertKpiTargetAchievementQuery, [company_id, financial_year, emp_code, staffid, kpiid, review_month, target, created_by], (err, result) => {
                if (err) {
                  console.error('Error inserting into hrms_prm_kpi_target_achievement:', err);
                  reject(err);
                } else {
                  resolve(result);
                }
              });
            }
          }
        });
      });
    });

    Promise.all(processKpiTargetPromises)
      .then(results => {
        res.status(200).json({ success: true, message: 'KPI Details updated successfully.', alert_type: 'success' });
      })
      .catch(err => {
        res.status(500).send('Error processing KPI details');
      });
  });
});


app.post('/save_goalTarget_aginst_existingGoal', async (req, res) => {
  const { company_id, financial_year, emp_code, staffid, goal_id, goal_task, uom, total_target, created_by, kpi_target } = req.body;

  try {
    // Insert into hrms_prm_task_title_details
    let insertResult = await new Promise((resolve, reject) => {
      connection.query(
        `INSERT INTO hrms_prm_task_title_details (company_id, financial_year, emp_code, staffid, goal_id, goal_task, uom, total_target, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [company_id, financial_year, emp_code, staffid, goal_id, goal_task, uom, total_target, created_by],
        (error, results) => {
          if (error) return reject(error);
          resolve(results);
        }
      );
    });

    const insertedId = insertResult.insertId;

    for (const target of kpi_target) {
      try {
        await new Promise((resolve, reject) => {
          connection.query(
            'INSERT INTO hrms_prm_kpi_target_achievement (company_id, financial_year, emp_code, staffid, kpi_id, review_month, target, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [company_id, financial_year, emp_code, staffid, insertedId, target.review_month, target.target, created_by],
            (err, result) => {
              if (err) return reject(err);
              resolve(result);
            }
          );
        });
      } catch (queryError) {
        console.error('Error during KPI target insertion:', queryError);
        return res.status(500).send('Error inserting KPI target details.');
      }
    }

    // Retrieve the inserted kpi details
    let kpiDetailResult = await new Promise((resolve, reject) => {
      connection.query(
        'SELECT id, company_id, staffid, emp_code, goal_id, financial_year, goal_task, uom, total_target FROM hrms_prm_task_title_details WHERE id = ?',
        [insertedId], // Use the correct insertedId
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    res.status(200).json({
      success: true,
      message: 'KPI Details added successfully against existing Goal.',
      alert_type: 'success',
      insertedDetails: kpiDetailResult
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred', error });
  }
});


// UPDATE Goal Title when edit
app.put('/update_goalTitle', (req, res) => {
  const goalId = req.query.goalId;
  const { goal_title } = req.body;

  if (!goal_title) {
    return res.status(400).json({ error: 'Missing Updated Goal' });
  }

  let updateGoalTitleQuery = `
    UPDATE hrms_prm_task_title
    SET goal_title = ?
    WHERE id = ?
  `;

  connection.query(updateGoalTitleQuery, [goal_title, goalId], (err, results) => {
    if (err) {
      console.error('Error updating Goal Title:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'goalId not found' });
    }

    res.status(200).json({ success: true, message: 'Goal Title updated successfully', alert_type: 'success' });
  });
});

app.put('/update_kpiAchieved', (req, res) => {
  const kpiId = parseFloat(req.query.kpiId);
  const { achieved } = req.body;
  const achievedNum = parseFloat(achieved);

  if (isNaN(achievedNum)) {
    return res.status(400).json({ error: 'Invalid or missing required fields' });
  }

  connection.query('UPDATE hrms_prm_kpi_target_achievement SET achieved = ? WHERE id = ?', [achievedNum, kpiId], (err, results) => {
    if (err || results.affectedRows === 0) {
      return res.status(err ? 500 : 404).json({ error: err ? 'Database error' : 'kpiId not found' });
    }
    res.status(200).json({ success: true, message: 'Target updated for kpiId', alert_type: 'success' });
  });
});


app.listen(5000)
