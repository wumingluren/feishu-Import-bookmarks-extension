import cheerio from "cheerio";
import { bitable } from "@lark-base-open/js-sdk";

/**
 * 解析书签的HTML内容，并返回一个结构化的书签列表。
 * @param {string} html 书签的HTML代码。
 * @returns {Array} 解析后的书签列表，每个书签是一个对象。
 */
export function parseBookmarksHtml(html) {
  // 使用cheerio加载HTML，以便进行DOM操作
  const $ = cheerio.load(html);
  const result = []; // 存储解析后的书签结果
  const rootDl = $("dl").first(); // 获取最顶层的<dl>元素

  // 检查是否成功获取到根<dl>元素
  if (rootDl.length) {
    // 如果找到，递归解析书签节点，并将结果合并到result数组中
    result.push(...parseBookmarkNodes($, rootDl, null));
  }

  return result; // 返回解析后的书签列表
}
/**
 * 解析书签节点
 * @param $ jQuery对象，用于DOM操作
 * @param parentNode jQuery对象，表示当前正在解析的父节点
 * @param parentId 字符串，当前父节点的ID
 * @returns {Array} 返回一个包含书签和文件夹的数组
 */
export function parseBookmarkNodes($, parentNode, parentId) {
  const bookmarks = []; // 用于存储解析后的书签和文件夹

  // 查找当前父节点下的所有DT元素
  const $dtElements = $(parentNode).find("> dt");

  $dtElements.each((i, dt) => {
    const $dt = $(dt);
    let bookmarkOrFolder;

    // 优先处理A标签，因为书签通常是链接形式
    const $a = $dt.find("> a");
    if ($a.length) {
      // 如果找到A标签，则表示这是一个书签
      const bookmarkId = randomID(); // 生成唯一的书签ID
      bookmarkOrFolder = {
        id: bookmarkId,
        parentId,
        title: $a.text().trim(), // 书签标题
        url: $a.attr("href"), // 书签URL
        addDate: $a.attr("add_date"), // 添加日期
        lastModified: $a.attr("last_modified"), // 最后修改日期
        icon: $a.attr("icon"), // 图标链接
      };
    } else {
      // 如果没有A标签，则尝试查找H3标签，以确定是否为文件夹
      // 确保我们查找的是直接的h3标签
      const $h3 = $dt.find("> h3");
      if ($h3.length) {
        // 如果找到H3标签，则表示这是一个文件夹
        const folderId = randomID(); // 生成唯一的文件夹ID
        const folderName = $h3.text().trim(); // 文件夹名称
        const folder = {
          id: folderId,
          parentId,
          title: folderName,
          children: [], // 存放子节点
        };

        // 查找并递归解析文件夹内的DL元素
        const subDl = $dt.find("> dl");
        if (subDl.length) {
          folder.children = parseBookmarkNodes($, subDl, folderId); // 递归解析子书签或子文件夹
        }

        bookmarkOrFolder = folder;
      } else {
        // 如果DT元素中既没有A标签也没有H3标签，则忽略此元素
        console.warn("Skipping DT element without A or H3 tag.");
        return;
      }
    }

    bookmarks.push(bookmarkOrFolder); // 将书签或文件夹添加到结果数组
  });

  return bookmarks; // 返回解析后的书签和文件夹数组
}
export function randomID() {
  return (
    Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
  ).substring(2, 15);
}

/**
 * 为给定的节点数组添加或设置disabled属性。
 * 遍历每个节点，如果节点没有子节点（children）且具有url属性，则将该节点的disabled属性设置为true。
 * 如果节点具有子节点，则递归调用此函数处理子节点。
 *
 * @param {Array} nodes - 要处理的节点数组，每个节点应包含children和url属性。
 * @return {Array} 返回处理后的节点数组，其中符合条件的节点将具有disabled属性。
 */
export function addDisabledProperty(nodes) {
  return nodes.map((node) => {
    // 判断是否需要设置disabled属性
    const shouldSetDisabled = !node.children && node.url;

    // 如果节点有子节点，则递归为子节点添加disabled属性
    if (node.children) {
      node.children = addDisabledProperty(node.children);
    } else if (shouldSetDisabled) {
      // 如果节点没有子节点但有url，设置节点的disabled属性为true
      node.disabled = true;
    }

    // 返回处理后的节点
    return node;
  });
}

/**
 * 从bitable中获取当前活跃表格的表头信息
 * @returns {Promise<Array>} 表头信息的Promise
 */
export async function getHeaderList() {
  try {
    const table = await bitable.base.getActiveTable();
    if (!table) {
      throw new Error("无法获取活跃表格");
    }
    const fields = await table.getFieldMetaList();
    if (!Array.isArray(fields)) {
      throw new Error("获取的表头信息不是数组");
    }
    console.log("表头信息", fields);
    return fields;
  } catch (error) {
    console.error("获取表头信息过程中出现错误：", error);
    throw error; // 重新抛出错误，或者根据业务需求进行其他处理
  }
}

/**
 * 在数组中查找指定名称的对象
 * @param {Array} array - 要搜索的数组
 * @param {string} name - 要查找的对象name属性的值
 * @returns {*} 找到的对象，如果没有找到则返回null
 */
export function findObjectByName(array, name) {
  // 确保array是数组，name是非空字符串
  if (!Array.isArray(array)) {
    console.warn("findObjectByName: 第一个参数不是数组");
    return null;
  }
  if (typeof name !== "string" || name.trim() === "") {
    console.warn("findObjectByName: 第二个参数不是非空字符串");
    return null;
  }

  for (const obj of array) {
    if (obj && obj.name === name) {
      return obj;
    }
  }
  return null; // 表示未找到
}

/**
 * 向指定表格中批量添加带有标题和网址的数据记录。
 * 对于缺少`url`属性的对象，将自动跳过。
 * @param {string} tableId 表格的唯一标识ID。
 * @param {Array<Object>} dataArray 包含标题和网址的对象数组，每个对象格式为 {title: string, url: string}。
 * @returns {Promise<Array<number>>} 返回一个承诺（Promise），该承诺解析为添加的记录的ID数组。
 * @throws {Error} 如果输入无效（例如，tableId为空，dataArray为空或长度为0），则抛出错误。
 */
export async function addRecordsWithTitlesAndUrls(tableId, dataArray) {
  // 定义字段名常量
  const FIELD_TITLE = "标题";
  const FIELD_URL = "网址";

  // 输入验证
  if (!tableId || !dataArray || dataArray.length === 0) {
    throw new Error("无效的输入：tableId 或 dataArray 为空");
  }

  try {
    // 获取指定ID的表格对象
    const table = await bitable.base.getTableById(tableId);

    // 获取用于存储标题和网址的字段对象
    const textField = await table.getField(FIELD_TITLE);
    const textField2 = await table.getField(FIELD_URL);

    // 过滤并批处理仅包含有效数据（即同时具有标题和网址）的对象
    const validDataArray = dataArray.filter((item) => item.title && item.url);
    /**
     * 根据有效数据数组生成一系列单元格的Promise。
     * 对于有效数据数组中的每个条目，都会创建两个单元格：一个用于标题，一个用于URL。
     * @param {Array} validDataArray - 包含标题和URL的对象数组。
     * @returns {Array} cellsPromises - 一个数组，其中每个元素都是一个包含两个单元格（标题和URL）的Promise数组。
     */
    const cellsPromises = validDataArray.map(({ title, url }) =>
      // 对每个有效数据对象，创建一个包含标题和URL单元格的Promise数组
      Promise.all([textField.createCell(title), textField2.createCell(url)])
    );

    // 等待所有单元格创建完成
    const cells = await Promise.all(cellsPromises);

    // 将单元格对映射到记录数组中
    // 当前属于多余代码，可有可无
    const records = cells.map((cellsPair) => [cellsPair[0], cellsPair[1]]);

    // 一次性添加所有记录并获取记录ID数组
    const recordIds = await table.addRecords(records);

    // 返回记录ID数组
    return recordIds;
  } catch (error) {
    // 错误处理逻辑
    console.error("添加记录时出错：", error);
    if (error instanceof bitable.Error) {
      // 处理特定的API错误
      if (error.code === bitable.Error.INVALID_OPERATION) {
        console.error("无效操作错误：", error.message);
      } else {
        throw error; // 重新抛出未处理的API错误
      }
    } else {
      throw error; // 重新抛出非API错误
    }
  }
}

/**
 * 在给定的树结构中，通过节点ID查找指定节点。
 * @param {Object} node - 树结构中的节点对象。
 * @param {string|number} treeId - 目标节点的ID。
 * @returns {Array} - 匹配目标ID的子节点数组，如果未找到则返回空数组。
 */
export function findNodeById(node, treeId) {
  // 校验输入参数的有效性
  if (!node || (typeof node !== "object" && node !== null)) {
    console.error("Invalid node object.");
    return [];
  }
  if (typeof treeId !== "string" && typeof treeId !== "number") {
    console.error("Invalid treeId type.");
    return [];
  }
  console.log(node, "循环", Array.isArray(node.children));
  // 检查当前节点是否为目标节点
  if (node.id === treeId) {
    // 直接返回当前节点（无变化，满足原函数逻辑）
    return node.children || [];
  } else if (node.children && Array.isArray(node.children)) {
    console.log(node.id, "二层循环啊啊", treeId);
    // 遍历当前节点的所有子节点
    for (let child of node.children) {
      // 递归在子节点中查找目标节点
      const result = findNodeById(child, treeId);
      // 如果在子节点中找到了目标节点，返回其子节点数组
      if (result.length > 0) {
        return result;
      }
      console.log(node.id, "二层循环", treeId);
    }
  }
  // 如果当前节点及其子节点都不匹配目标ID，返回空数组
  return [];
}
